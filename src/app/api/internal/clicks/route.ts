import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { trackLinkClicked } from "@/lib/posthog";
import { getDefaultDomain } from "@/lib/utils";
import { incrementUsage } from "@/lib/billing/usage";
import { sendWebhookEvent } from "@/lib/svix/send";

type ClickPayload = {
  linkId: string;
  workspaceId: string;
  slug: string;
  destination: string;
  variant?: string;
  timestamp: string;
  ipHash: string;
  isUnique: boolean;
  device: string;
  browser: string;
  os: string;
  country: string;
  city?: string;
  region?: string;
  referrer?: string;
  referrerDomain?: string;
  language?: string;
  isQrScan?: boolean;
  isDeepLink?: boolean;
};

/**
 * Internal endpoint called by the Cloudflare Worker (or queue consumer fallback)
 * after every redirect. Handles Redis writes, PostHog, billing, and webhooks.
 *
 * POST /api/internal/clicks
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ClickPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    linkId,
    workspaceId,
    slug,
    variant,
    timestamp,
    ipHash,
    isUnique,
    device,
    browser,
    os,
    country,
    referrer,
    referrerDomain,
    isQrScan,
    isDeepLink,
  } = body;

  if (!linkId) {
    return NextResponse.json({ error: "Missing linkId" }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const clickTs = new Date(timestamp).getTime();

    // Write to Redis for realtime feed (idempotent — queue consumer may also write)
    if (slug) {
      await Promise.all([
        redis.lpush(`clicks:${slug}`, JSON.stringify({
          ts: clickTs,
          device,
          browser,
          os,
          country,
          referrer: referrer ?? null,
          referrerDomain: referrerDomain ?? null,
          abVariant: variant ?? null,
        })),
        redis.ltrim(`clicks:${slug}`, 0, 49),
        redis.incr(`stats:clicks:${slug}:daily:${today}`),
        redis.incr(`stats:clicks:${slug}:total`),
        redis.incr(`stats:clicks:daily:${today}`),
        redis.incr(`stats:clicks:total`),
      ]);
    }

    // Persist click to PostgreSQL for analytics dashboard & link counters
    await db.insert(clicks).values({
      linkId,
      workspaceId,
      ip: ipHash,
      country: country ?? null,
      city: body.city ?? null,
      region: body.region ?? null,
      device: device === "bot" ? "unknown" : (device as "desktop" | "mobile" | "tablet" | "unknown"),
      browser: browser ?? null,
      os: os ?? null,
      referrer: referrer ?? null,
      referrerDomain: referrerDomain ?? null,
      isQrScan: isQrScan ?? false,
      isDeepLink: isDeepLink ?? false,
      abVariant: variant ?? null,
      abTestId: null,
    }).catch((e) => console.error("[internal/clicks] DB insert failed", e));

    await db.update(links)
      .set({ totalClicks: sql`total_clicks + 1` })
      .where(eq(links.id, linkId))
      .catch((e) => console.error("[internal/clicks] totalClicks update failed", e));

    if (isUnique) {
      await db.update(links)
        .set({ uniqueClicks: sql`unique_clicks + 1` })
        .where(eq(links.id, linkId))
        .catch((e) => console.error("[internal/clicks] uniqueClicks update failed", e));
    }

    // Track click event in PostHog
    await trackLinkClicked({ linkId, domain: getDefaultDomain() }).catch(() => {});

    // Increment monthly clicksTracked usage
    if (workspaceId) {
      try {
        await incrementUsage(workspaceId, "clicksTracked", 1);
      } catch (e) {
        console.warn("[POST /api/internal/clicks] increment usage failed", e);
      }

      // Fire webhook event
      sendWebhookEvent({
        eventType: "link.clicked",
        workspaceId,
        data: {
          linkId,
          slug,
          domain: getDefaultDomain(),
          country: country ?? null,
          device,
          browser: browser ?? null,
          os: os ?? null,
          referrer: referrer ?? "",
          referrerDomain: referrerDomain ?? null,
          abVariant: variant ?? null,
          isBot: device === "bot",
          isQrScan: isQrScan ?? false,
          ipHash,
          timestamp: clickTs,
        },
        idempotencyKey: `link.clicked-${linkId}-${timestamp}`,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/internal/clicks]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
