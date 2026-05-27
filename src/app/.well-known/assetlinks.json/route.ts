import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const deepLinks = await db
      .select({
        androidPackageName: links.androidPackageName,
        sha256CertFingerprints: links.sha256CertFingerprints,
      })
      .from(links)
      .where(
        and(
          sql`${links.domainId} IS NULL`,
          eq(links.appLinksEnabled, true),
          isNotNull(links.androidPackageName)
        )
      );

    const androidMap = new Map<string, Set<string>>();
    for (const l of deepLinks) {
      if (l.androidPackageName) {
        if (!androidMap.has(l.androidPackageName)) {
          androidMap.set(l.androidPackageName, new Set());
        }
        for (const fp of l.sha256CertFingerprints ?? []) {
          if (fp.trim()) androidMap.get(l.androidPackageName)!.add(fp.trim());
        }
      }
    }

    const assetLinks: {
      relation: string[];
      target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
    }[] = [];

    for (const [pkg, fingerprints] of androidMap) {
      assetLinks.push({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: pkg,
          sha256_cert_fingerprints: fingerprints.size > 0 ? [...fingerprints] : [],
        },
      });
    }

    return NextResponse.json(assetLinks);
  } catch {
    return NextResponse.json([]);
  }
}
