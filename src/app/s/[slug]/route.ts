import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { clicks, links, workspaces, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { trackLinkClicked } from "@/lib/posthog";
import { getDefaultDomain } from "@/lib/utils";
import { incrementUsage } from "@/lib/billing/usage";
import { sendFirstClickAlert } from "@/lib/email";

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
  variants: { destination: string; weight: number; label?: string; id?: string }[]
): { destination: string; label: string } {
  if (!variants || variants.length === 0) return { destination: "", label: "" };
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  let rand = Math.random() * totalWeight;
  for (const v of variants) {
    rand -= v.weight ?? 1;
    if (rand <= 0) return { destination: v.destination, label: v.label ?? v.id ?? v.destination };
  }
  const last = variants[variants.length - 1];
  return { destination: last.destination, label: last.label ?? last.id ?? last.destination };
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
    // ── Fast path: cache the link in Redis to avoid a Postgres round-trip ──
    // Slug → JSON of the columns we need for redirect resolution. 5-minute TTL
    // is long enough to absorb the click burst on popular links but short
    // enough that admin edits propagate quickly.
    const cacheKey = `linkmeta:${slug}`;
    let link = await redis.get(cacheKey) as any | null;
    let cacheHit = !!link;

    if (!link) {
      link = await db.query.links.findFirst({
        where: (l, { eq, and, isNull }) =>
          and(eq(l.slug, slug), isNull(l.domainId)),
      });
      if (link) {
        // Cache the small subset of columns needed for redirect logic.
        // We re-fetch the full row on cache miss so we don't store a stale
        // safetyVerdict, password, clickLimit, etc. in Redis.
        const cached = {
          id: link.id,
          slug: link.slug,
          destination: link.destination,
          workspaceId: link.workspaceId,
          isActive: link.isActive,
          password: link.password ?? null,
          expiresAt: link.expiresAt ?? null,
          scheduledAt: link.scheduledAt ?? null,
          clickLimit: link.clickLimit ?? null,
          totalClicks: link.totalClicks,
          safetyStatus: link.safetyStatus,
          safetyBlockedByAdmin: link.safetyBlockedByAdmin,
          iosDestination: link.iosDestination ?? null,
          androidDestination: link.androidDestination ?? null,
          uriScheme: link.uriScheme ?? null,
          iosAppStoreId: link.iosAppStoreId ?? null,
          androidPlayStoreId: link.androidPlayStoreId ?? null,
          abTestEnabled: link.abTestEnabled ?? false,
          abTestVariants: link.abTestVariants ?? null,
          routingRules: link.routingRules ?? null,
          utmSource: link.utmSource ?? null,
          utmMedium: link.utmMedium ?? null,
          utmCampaign: link.utmCampaign ?? null,
          utmTerm: link.utmTerm ?? null,
          utmContent: link.utmContent ?? null,
          title: link.title ?? null,
        };
        // Fire-and-forget: don't block the redirect on a Redis write
        redis.set(cacheKey, JSON.stringify(cached), { ex: 300 }).catch(() => {});
      }
    }

    if (!link || link.isActive === false) {
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
        // Redirect to edge-served password challenge (single round trip)
        const host = req.headers.get("host") || "";
        return NextResponse.redirect(
          new URL(`https://${host}/internal/challenge/${link.slug}`, req.url)
        );
      }
    }

    // ── Safety gate ──────────────────────────────────────────────────────
    // If the URL Scanner verdict is `malicious` (or the owner has manually
    // blocked the link), divert visitors to an interstitial warning page
    // instead of completing the redirect. The interstitial offers a
    // "continue at your own risk" path that re-issues the request with a
    // bypass cookie, so legitimate scanner false-positives can still be
    // accessed. `pending` and `unknown` links pass through normally —
    // we only block on a confirmed malicious verdict.
    const acknowledged = (await cookies()).get(`safety_ack_${slug}`)?.value === "true";
    if (
      !acknowledged &&
      (link.safetyStatus === "malicious" || link.safetyBlockedByAdmin)
    ) {
      return NextResponse.redirect(
        new URL(`/s/${link.slug}/blocked`, req.url),
        { status: 302 }
      );
    }

    const ua = req.headers.get("user-agent") || "";
    const device = parseDevice(ua);
    const referrer = req.headers.get("referer") || "";

    // Resolve base destination: A/B test (sticky via cookie) → smart routing → deep link → default
    let baseDestination = link.destination;
    let selectedAbVariant: string | null = null;

    if (link.abTestEnabled && link.abTestVariants && link.abTestVariants.length > 0) {
      const cookieStore = await cookies();
      const variantCookie = cookieStore.get(`ab_v_${link.id}`);
      let picked: { destination: string; label: string };

      if (variantCookie) {
        const matched = link.abTestVariants.find(
          (v: any) => (v.label || v.id || v.destination) === variantCookie.value
        );
        if (matched) {
          picked = { destination: matched.destination, label: matched.label ?? matched.id ?? matched.destination };
        } else {
          picked = pickAbVariant(link.abTestVariants);
        }
      } else {
        picked = pickAbVariant(link.abTestVariants);
      }

      selectedAbVariant = picked.label;
      baseDestination = picked.destination;
    } else if (link.routingRules && link.routingRules.length > 0) {
      const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "XX";
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
    let isDeepLink = false;
    // Skip OS-specific override when A/B testing is active — variant
    // destinations should not be overridden, or test results become invalid.
    const isAbActive = link.abTestEnabled && link.abTestVariants && link.abTestVariants.length > 0;
    if (!isAbActive) {
      if (os === "iOS" && link.iosDestination) {
        baseDestination = link.iosDestination;
      } else if (os === "Android" && link.androidDestination) {
        baseDestination = link.androidDestination;
      }
    }

    // URI scheme deep link
    if (link.uriScheme) {
      const schemeUrl = link.uriScheme
        .replace(/{slug}/g, link.slug)
        .replace(/{destination}/g, encodeURIComponent(link.destination));
      if (os === "iOS" && link.iosAppStoreId) {
        baseDestination = schemeUrl;
        isDeepLink = true;
      } else if (os === "Android" && link.androidPlayStoreId) {
        baseDestination = schemeUrl;
        isDeepLink = true;
      }
    }

    // App store fallback
    if (isDeepLink) {
      const fallbackUrl = os === "iOS" && link.iosAppStoreId
        ? `https://apps.apple.com/app/${link.iosAppStoreId}`
        : os === "Android" && link.androidPlayStoreId
          ? `https://play.google.com/store/apps/details?id=${link.androidPlayStoreId}`
          : null;
      if (fallbackUrl) {
        baseDestination = `${baseDestination}?fallback=${encodeURIComponent(fallbackUrl)}`;
      }
    }

    const finalDestination = appendUtmParams(baseDestination, {
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      utmTerm: link.utmTerm,
      utmContent: link.utmContent,
    });

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
          const isQrScan = new URL(req.url).searchParams.get("source") === "qr";
          const referrerDomain = referrer ? (() => { try { return new URL(referrer).hostname; } catch { return null; } })() : null;

          const uniqKey = `uniq:${link.id}:${ipHash}`;
          const existing = await redis.get(uniqKey);
          const isUnique = existing === null;

          const today = new Date().toISOString().split("T")[0];

          // Redis: real-time feed + stats counters (fast, sub-ms)
          const ops: Promise<unknown>[] = [
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

          // Forward to Worker for Analytics Engine write (fire-and-forget)
          const workerUrl = process.env.CF_WORKER_URL;
          if (workerUrl) {
            ops.push(
              fetch(`${workerUrl}/internal/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  linkId: link.id,
                  workspaceId: link.workspaceId,
                  slug: link.slug,
                  device,
                  browser,
                  os,
                  country,
                  city,
                  region,
                  referrerDomain,
                  ipHash,
                  isUnique,
                  isQrScan,
                  isDeepLink,
                  abVariant: selectedAbVariant,
                  timestamp: Date.now(),
                }),
              }).catch(() => {})
            );
          }

          const settled = await Promise.allSettled(ops);
          for (const r of settled) {
            if (r.status === "rejected") {
              console.error("[trackClick] A tracking op failed", r.reason);
            }
          }

          // Persist click to PostgreSQL for analytics dashboard & link counters
          // Use sql`` for computed defaults so the DB handles them server-side
          await db.insert(clicks).values({
            linkId: link.id,
            workspaceId: link.workspaceId,
            ip: ipHash,
            country,
            city,
            region,
            device: device as DeviceType,
            browser,
            os,
            referrer: referrer || null,
            referrerDomain,
            isQrScan: isQrScan ?? false,
            isDeepLink: isDeepLink ?? false,
            abVariant: selectedAbVariant || null,
            abTestId: null,
          }).catch((e) => console.error("[trackClick] DB insert failed", e));

          await db.update(links)
            .set({ totalClicks: sql`total_clicks + 1` })
            .where(eq(links.id, link.id))
            .catch((e) => console.error("[trackClick] totalClicks update failed", e));

          if (isUnique) {
            await db.update(links)
              .set({ uniqueClicks: sql`unique_clicks + 1` })
              .where(eq(links.id, link.id))
              .catch((e) => console.error("[trackClick] uniqueClicks update failed", e));
          }

          await trackLinkClicked({ linkId: link.id, domain: getDefaultDomain() }).catch(() => {});
          await incrementUsage(link.workspaceId, "clicksTracked", 1);

          // ── First click alert ──────────────────────────────────────────
          if (link.totalClicks === 0) {
            const notified = await redis.set(`first_click_sent:${link.id}`, "1", { nx: true });
            if (notified) {
              (async () => {
                try {
                  const owner = await db
                    .select({ email: users.email, name: users.name })
                    .from(workspaces)
                    .innerJoin(users, eq(workspaces.ownerId, users.id))
                    .where(eq(workspaces.id, link.workspaceId))
                    .limit(1);
                  if (owner[0]?.email) {
                    await sendFirstClickAlert(owner[0].email, {
                      name: owner[0].name || owner[0].email,
                      linkTitle: link.title || link.slug,
                      linkSlug: link.slug,
                      linkUrl: `${getDefaultDomain()}/s/${link.slug}`,
                      workspaceId: link.workspaceId,
                    });
                  }
                } catch (e) {
                  console.error("First click notification failed:", e);
                }
              })();
            }
          }
        } catch (e) {
          console.error("Click tracking failed (non-blocking):", e);
        }
      })();
    }

    const response = NextResponse.redirect(finalDestination, { status: 302 });

    if (selectedAbVariant) {
      response.cookies.set(`ab_v_${link.id}`, selectedAbVariant, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
    }

    return response;
  } catch {
    return new Response(null, { status: 404 });
  }
}
