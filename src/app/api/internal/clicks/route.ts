import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links, domains } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { redis } from "@/lib/redis";
import { trackLinkClicked } from "@/lib/posthog";
import { getDefaultDomain } from "@/lib/utils";
import { incrementUsage } from "@/lib/billing/usage";

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
  /** True when the request came via a QR code scan (?source=qr) */
  isQrScan?: boolean;
};

/**
 * Internal endpoint called ASYNCHRONOUSLY by the Cloudflare Worker after
 * every redirect. Records click analytics and increments totalClicks.
 *
 * POST /api/internal/clicks
 */
export async function POST(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
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
    variant,
    timestamp,
    ipHash,
    isUnique,
    device,
    browser,
    os,
    country,
    city,
    region,
    referrer,
    referrerDomain,
    isQrScan,
  } = body;

  if (!linkId || !workspaceId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Map device string to the schema's deviceEnum values
  type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  const deviceValue: DeviceType = (["desktop", "mobile", "tablet", "bot"].includes(device)
    ? device
    : "unknown") as DeviceType;

  try {
    // Insert click record + increment totalClicks atomically
    // Also get domain info for PostHog tracking
    const link = await db.query.links.findFirst({
      where: eq(links.id, linkId),
    });

    const domain = link?.domainId
      ? await db.query.domains.findFirst({
        where: eq(domains.id, link.domainId),
      })
      : null;

    const today = new Date().toISOString().split("T")[0];

    const dbResults = await Promise.allSettled([
      db.insert(clicks).values({
        linkId,
        workspaceId,
        ip: ipHash,
        device: deviceValue,
        browser: browser ?? null,
        os: os ?? null,
        country: country ?? null,
        city: city ?? null,
        region: region ?? null,
        referrer: referrer ?? null,
        referrerDomain: referrerDomain ?? null,
        abVariant: variant ?? null,
        isQrScan: isQrScan ?? false,
        createdAt: new Date(timestamp),
      }),
      ...(isUnique
        ? [
          db
            .update(links)
            .set({
              totalClicks: sql`${links.totalClicks} + 1`,
              uniqueClicks: sql`${links.uniqueClicks} + 1`,
            })
            .where(eq(links.id, linkId)),
        ]
        : [
          db
            .update(links)
            .set({ totalClicks: sql`${links.totalClicks} + 1` })
            .where(eq(links.id, linkId)),
        ]),
    ]);
    for (const r of dbResults) {
      if (r.status === "rejected") {
        console.error("[POST /api/internal/clicks] A DB op failed", r.reason);
      }
    }

    // Write to Redis for realtime feed (best-effort)
    try {
      const slug = body.slug || link?.slug;
      if (slug) {
        await Promise.all([
          redis.lpush(`clicks:${slug}`, JSON.stringify({
            ts: new Date(timestamp).getTime(),
            device: deviceValue,
            browser,
            os,
            country,
            referrer: referrer ?? null,
            referrerDomain: referrerDomain ?? null,
          })),
          redis.ltrim(`clicks:${slug}`, 0, 49),
          redis.incr(`stats:clicks:${slug}:daily:${today}`),
          redis.incr(`stats:clicks:${slug}:total`),
          redis.incr(`stats:clicks:daily:${today}`),
          redis.incr(`stats:clicks:total`),
        ]);
      }
    } catch (e) {
      console.warn("[POST /api/internal/clicks] Redis write failed (non-blocking)", e);
    }

    // Track click event in PostHog (non-blocking, best effort)
    if (link) {
      trackLinkClicked({
        linkId,
        domain: domain?.domain || getDefaultDomain(),
      });
    }

    // Increment monthly clicksTracked usage (best-effort)
    try {
      await incrementUsage(workspaceId, "clicksTracked", 1);
    } catch (e) {
      console.warn("[POST /api/internal/clicks] increment usage failed", e);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/internal/clicks]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
