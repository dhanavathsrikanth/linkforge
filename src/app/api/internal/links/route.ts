import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_DOMAINS = [
  "pivoturl.com",
  "www.pivoturl.com",
  "localhost",
  "localhost:3000",
  "links.pivoturl.com",
];

export async function GET(req: Request) {
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") ?? "").toLowerCase();
  const slug = searchParams.get("slug") ?? "";

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    let link: any = null;
    let matchedDomainRecord: any = null;

    //
    // Step 1: Find the domain record first, if this is a custom domain
    //
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.domain, domain),
    });

    //
    // Step 2: If we found a custom domain, look for link matching (domainId, slug)
    //
    if (domainRecord) {
      matchedDomainRecord = domainRecord;
      link = await db.query.links.findFirst({
        where: (l, { eq, and }) => and(
          eq(l.slug, slug),
          eq(l.domainId, domainRecord.id)
        ),
        with: { domain: true },
      });
    }

    //
    // Step 3: If no custom domain link found, check if accessing via DEFAULT domain
    //         If yes, look for link with domainId IS NULL
    //
    if (!link && DEFAULT_DOMAINS.includes(domain)) {
      link = await db.query.links.findFirst({
        where: (l, { eq, and, isNull }) => and(
          eq(l.slug, slug),
          isNull(l.domainId)
        ),
      }) as any;
    }

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Shape the response to match what the worker's LinkData type expects
    const shaped = {
      id: link.id,
      slug: link.slug,
      domain: (link as any).domain?.domain ?? (matchedDomainRecord?.domain || null),
      destination: link.destination,
      isActive: link.isActive,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      scheduledAt: link.scheduledAt?.toISOString() ?? null,
      expiresAfterClicks: link.clickLimit ?? null,
      totalClicks: link.totalClicks,
      password: link.password ?? null,
      utmSource: link.utmSource ?? null,
      utmMedium: link.utmMedium ?? null,
      utmCampaign: link.utmCampaign ?? null,
      utmTerm: link.utmTerm ?? null,
      utmContent: link.utmContent ?? null,
      iosDestination: link.iosDestination ?? null,
      androidDestination: link.androidDestination ?? null,
      routingRules: link.routingRules ?? null,
      abTestEnabled: link.abTestEnabled,
      abVariants: link.abTestVariants ?? null,
      workspaceId: link.workspaceId,
    };

    return NextResponse.json(shaped);
  } catch (err) {
    console.error("[GET /api/internal/links]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
