import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domains, cfHostnameStatusEnum, cfSslStatusEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  cloudflareCustomHostnames,
  type CfHostnameStatus,
  type CfSslStatus,
} from "@/lib/cloudflare/custom-hostnames";

/**
 * Daily Cloudflare status sync / DNS drift detection
 * (custom-domain-assignment Req 18). Refreshes cfHostnameStatus/cfSslStatus
 * for every verified domain and flags drift (`moved`/`deleted`) — never
 * auto-suspends or deletes.
 *
 * Auth: x-internal-secret header (matches the URL-scanner crons).
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!cloudflareCustomHostnames.isConfigured()) {
    return NextResponse.json({ ok: true, skipped: "cloudflare_not_configured" });
  }

  try {
    const verified = await db.query.domains.findMany({
      where: eq(domains.verified, true),
      columns: { id: true, domain: true, cfHostnameId: true },
    });

    let checked = 0;
    let drifted = 0;
    const driftedDomains: string[] = [];

    for (const d of verified) {
      if (!d.cfHostnameId) continue;
      checked++;
      try {
        const cf = await cloudflareCustomHostnames.get(d.cfHostnameId);
        const hostnameStatus = cf.status as CfHostnameStatus;
        const sslStatus = (cf.ssl?.status ?? null) as CfSslStatus | null;
        const isDrifted = hostnameStatus === "moved" || hostnameStatus === "deleted";
        if (isDrifted) {
          drifted++;
          driftedDomains.push(d.domain);
        }
        await db
          .update(domains)
          .set({
            cfHostnameStatus: hostnameStatus,
            cfSslStatus: sslStatus,
            cfStatusUpdatedAt: new Date(),
          })
          .where(eq(domains.id, d.id));
      } catch (err) {
        console.warn(`[status-sync] CF get failed for ${d.domain}:`, err);
      }
    }

    return NextResponse.json({ ok: true, checked, drifted, driftedDomains });
  } catch (err) {
    console.error("[POST /api/internal/domains/status-sync]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
