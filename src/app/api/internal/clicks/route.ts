import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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
    await Promise.all([
      db.insert(clicks).values({
        linkId,
        workspaceId,
        // Schema uses `ip` column for the privacy-hashed IP
        ip: ipHash,
        device: deviceValue,
        browser: browser ?? null,
        os: os ?? null,
        country: country ?? null,
        city: city ?? null,
        region: region ?? null,
        referrer: referrer ?? null,
        referrerDomain: referrerDomain ?? null,
        // Map variant → abVariant column
        abVariant: variant ?? null,
        createdAt: new Date(timestamp),
      }),
      // Increment the denormalized totalClicks counter on the link row
      // Also increment uniqueClicks if this is a unique visitor
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/internal/clicks]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
