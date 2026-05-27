import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const deepLinks = await db
      .select({ iosBundleId: links.iosBundleId })
      .from(links)
      .where(
        and(
          sql`${links.domainId} IS NULL`,
          eq(links.universalLinksEnabled, true),
          isNotNull(links.iosBundleId)
        )
      );

    const appIDs = [...new Set(deepLinks.map((l) => l.iosBundleId!))];

    const config = {
      applinks: {
        apps: [],
        details: appIDs.length > 0
          ? [{ appIDs, components: [{ "/": "/s/*" }, { "/": "/*" }] }]
          : [{ appIDs: [], components: [{ "/": "/s/*" }, { "/": "/*" }] }],
      },
    };

    return NextResponse.json(config);
  } catch {
    return NextResponse.json({
      applinks: { apps: [], details: [{ appIDs: [], components: [{ "/": "/s/*" }, { "/": "/*" }] }] },
    });
  }
}
