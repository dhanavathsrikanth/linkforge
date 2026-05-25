import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { trackLinkClicked } from "@/lib/posthog";
import { getDefaultDomain } from "@/lib/utils";
import { incrementUsage } from "@/lib/billing/usage";

type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

function parseDevice(ua: string): DeviceType {
  if (!ua) return "unknown";
  if (/bot|crawl|spider/i.test(ua)) return "bot";
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|kindle/i.test(ua)) return "mobile";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (!ua) return "Other";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  return "Other";
}

function parseOs(ua: string): string {
  if (!ua) return "Other";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  return "Other";
}

function pickAbVariant(
  variants: { destination: string; weight: number }[]
): { destination: string } {
  if (!variants || variants.length === 0) return { destination: "" };
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  let rand = Math.random() * totalWeight;
  for (const v of variants) {
    rand -= v.weight ?? 1;
    if (rand <= 0) return { destination: v.destination };
  }
  return { destination: variants[variants.length - 1].destination };
}

function appendUtmParams(
  url: string,
  utm: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
  }
): string {
  if (!utm.utmSource && !utm.utmMedium && !utm.utmCampaign && !utm.utmTerm && !utm.utmContent) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (utm.utmSource) parsed.searchParams.set("utm_source", utm.utmSource);
    if (utm.utmMedium) parsed.searchParams.set("utm_medium", utm.utmMedium);
    if (utm.utmCampaign) parsed.searchParams.set("utm_campaign", utm.utmCampaign);
    if (utm.utmTerm) parsed.searchParams.set("utm_term", utm.utmTerm);
    if (utm.utmContent) parsed.searchParams.set("utm_content", utm.utmContent);
    return parsed.toString();
  } catch {
    return url;
  }
}

async function hashIp(ip: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  return "127.0.0.1";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 1) {
    return new Response(null, { status: 404 });
  }

  try {
    const link = await db.query.links.findFirst({
      where: (l, { eq, and, isNull }) =>
        and(eq(l.slug, slug), isNull(l.domainId)),
    });

    if (!link || !link.isActive) {
      return new Response(null, { status: 404 });
    }

    if (link.scheduledAt && new Date(link.scheduledAt) > new Date()) {
      return new Response(null, { status: 404 });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return new Response(null, { status: 410 });
    }

    if (link.clickLimit !== null && link.totalClicks >= link.clickLimit) {
      return new Response(null, { status: 410 });
    }

    if (link.password) {
      const cookieStore = await cookies();
      const authed = cookieStore.get(`pw_auth_${slug}`);
      if (!authed || authed.value !== "true") {
        return NextResponse.redirect(
          new URL(`/challenge/${link.slug}`, req.url)
        );
      }
    }

    const ua = req.headers.get("user-agent") || "";
    const device = parseDevice(ua);
    const referrer = req.headers.get("referer") || "";

    // Pick A/B variant before tracking so we can record which was served
    let selectedAbVariant: string | null = null;
    if (link.abTestEnabled && link.abTestVariants && link.abTestVariants.length > 0) {
      const picked = pickAbVariant(link.abTestVariants);
      selectedAbVariant = (picked as any).name || picked.destination;
    }

    if (device !== "bot") {
      (async () => {
        try {
          const rawIp = getClientIp(req);
          const ipHash = await hashIp(rawIp);
          const browser = parseBrowser(ua);
          const os = parseOs(ua);
          const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "XX";
          const city = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || null;
          const region = req.headers.get("cf-region") || req.headers.get("x-vercel-ip-country-region") || null;
          const language = (req.headers.get("accept-language") || "").split(",")[0]?.split(";")[0]?.trim() || "";
          const isQrScan = new URL(req.url).searchParams.get("source") === "qr";
          const referrerDomain = referrer ? (() => { try { return new URL(referrer).hostname; } catch { return null; } })() : null;

          const uniqKey = `uniq:${link.id}:${ipHash}`;
          const existing = await redis.get(uniqKey);
          const isUnique = existing === null;

          const today = new Date().toISOString().split("T")[0];
          const ops: Promise<unknown>[] = [
            db.insert(clicks).values({
              linkId: link.id,
              workspaceId: link.workspaceId,
              ip: ipHash,
              device,
              browser,
              os,
              country,
              city,
              region,
              referrer,
              referrerDomain,
              isQrScan,
              abVariant: selectedAbVariant,
              createdAt: new Date(),
            }),
            db.update(links)
              .set({
                totalClicks: sql`${links.totalClicks} + 1`,
                ...(isUnique ? { uniqueClicks: sql`${links.uniqueClicks} + 1` } : {}),
              })
              .where(eq(links.id, link.id)),
            redis.lpush(`clicks:${slug}`, JSON.stringify({
              ts: Date.now(),
              device, browser, os, country, city,
              referrer: referrer || null,
              referrerDomain,
              abVariant: selectedAbVariant,
            })),
            redis.ltrim(`clicks:${slug}`, 0, 49),
            redis.incr(`stats:clicks:daily:${today}`),
            redis.incr(`stats:clicks:total`),
            redis.incr(`stats:clicks:${slug}:daily:${today}`),
            redis.incr(`stats:clicks:${slug}:total`),
          ];

          if (isUnique) {
            ops.push(redis.set(uniqKey, "1").then(() => redis.expire(uniqKey, 86400)));
          }

          const settled = await Promise.allSettled(ops);
          for (const r of settled) {
            if (r.status === "rejected") {
              console.error("[trackClick] A tracking op failed", r.reason);
            }
          }

          await trackLinkClicked({ linkId: link.id, domain: getDefaultDomain() }).catch(() => {});
          await incrementUsage(link.workspaceId, "clicksTracked", 1);
        } catch (e) {
          console.error("Click tracking failed (non-blocking):", e);
        }
      })();
    }

    // Resolve base destination: A/B test → smart routing → deep link → default
    let baseDestination = link.destination;

    if (selectedAbVariant) {
      const picked = pickAbVariant(link.abTestVariants!);
      baseDestination = picked.destination;
    } else if (link.routingRules && link.routingRules.length > 0) {
      const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "";
      const language = (req.headers.get("accept-language") || "").split(",")[0]?.split(";")[0]?.trim() || "";
      for (const rule of link.routingRules) {
        let match = true;
        if (rule.condition.device && rule.condition.device !== parseDevice(ua)) match = false;
        if (rule.condition.country && rule.condition.country.toUpperCase() !== country.toUpperCase()) match = false;
        if (rule.condition.language && !language.toLowerCase().startsWith(rule.condition.language.toLowerCase())) match = false;
        if (match) { baseDestination = rule.destination; break; }
      }
    }

    const os = parseOs(ua);
    if (os === "iOS" && link.iosDestination) {
      baseDestination = link.iosDestination;
    } else if (os === "Android" && link.androidDestination) {
      baseDestination = link.androidDestination;
    }

    const destination = appendUtmParams(baseDestination, {
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      utmTerm: link.utmTerm,
      utmContent: link.utmContent,
    });

    return NextResponse.redirect(destination, { status: 302 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
