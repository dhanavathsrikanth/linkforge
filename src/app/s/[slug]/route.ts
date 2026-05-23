import { NextResponse } from "next/server";
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

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return new Response(null, { status: 410 });
    }

    if (link.clickLimit !== null && link.totalClicks >= link.clickLimit) {
      return new Response(null, { status: 410 });
    }

    if (link.password) {
      return NextResponse.redirect(
        new URL(`/protected?id=${link.id}`, req.url)
      );
    }

    const ua = req.headers.get("user-agent") || "";
    const device = parseDevice(ua);
    const referrer = req.headers.get("referer") || "";

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
          const referrerDomain = referrer ? (() => { try { return new URL(referrer).hostname; } catch { return ""; } })() : "";

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
              createdAt: new Date(),
            }),
            db.update(links)
              .set({
                totalClicks: sql`${links.totalClicks} + 1`,
                ...(isUnique ? { uniqueClicks: sql`${links.uniqueClicks} + 1` } : {}),
              })
              .where(eq(links.id, link.id)),
            redis.lpush(`clicks:${slug}`, JSON.stringify({
              timestamp: Date.now(),
              device, browser, os, country, referrerDomain,
            })),
            redis.ltrim(`clicks:${slug}`, 0, 49),
            redis.incr(`stats:clicks:daily:${today}`),
            redis.incr(`stats:clicks:total`),
          ];

          if (isUnique) {
            ops.push(redis.set(uniqKey, "1").then(() => redis.expire(uniqKey, 86400)));
          }

          await Promise.allSettled(ops);

          trackLinkClicked({ linkId: link.id, domain: getDefaultDomain() });
          await incrementUsage(link.workspaceId, "clicksTracked", 1);
        } catch (e) {
          console.error("Click tracking failed (non-blocking):", e);
        }
      })();
    }

    return NextResponse.redirect(link.destination, { status: 302 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
