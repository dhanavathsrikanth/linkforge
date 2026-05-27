import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links, domains } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

type AppAssociation = {
  /** apple-app-site-association details */
  apple: {
    appIDs: string[];
    components: { "/": string; comment?: string }[];
  }[];
  /** assetlinks.json entries */
  android: {
    relation: string[];
    target: {
      namespace: string;
      package_name: string;
      sha256_cert_fingerprints: string[];
    };
  }[];
};

export async function GET(req: Request) {
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain") ?? "";

  if (!domain) {
    return NextResponse.json({ error: "Missing domain" }, { status: 400 });
  }

  try {
    const domainLower = domain.toLowerCase();
    let domainId: string | null = null;

    // If it's a custom domain, look up the domain record
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.domain, domainLower),
    });
    if (domainRecord) {
      domainId = domainRecord.id;
    }

    // Query all links on this domain that have deep linking enabled
    const whereClause = domainId
      ? and(
          eq(links.domainId, domainId),
          sql`(${links.universalLinksEnabled} = true OR ${links.appLinksEnabled} = true)`
        )
      : and(
          sql`${links.domainId} IS NULL`,
          sql`(${links.universalLinksEnabled} = true OR ${links.appLinksEnabled} = true)`
        );

    const deepLinks = await db
      .select({
        slug: links.slug,
        iosBundleId: links.iosBundleId,
        androidPackageName: links.androidPackageName,
        sha256CertFingerprints: links.sha256CertFingerprints,
        universalLinksEnabled: links.universalLinksEnabled,
        appLinksEnabled: links.appLinksEnabled,
      })
      .from(links)
      .where(whereClause);

    const association: AppAssociation = {
      apple: [],
      android: [],
    };

    // Build iOS app IDs — unique bundle IDs
    const iosBundleIds = new Set(
      deepLinks
        .filter((l) => l.universalLinksEnabled && l.iosBundleId)
        .map((l) => l.iosBundleId!)
    );

    if (iosBundleIds.size > 0) {
      const appIDs = [...iosBundleIds].map((id) => id);
      association.apple = [
        {
          appIDs,
          components: [
            { "/": "/s/*", comment: "All short link paths" },
            { "/": "/*", comment: "All paths" },
          ],
        },
      ];
    }

    // Build Android entries — unique package + fingerprint combos
    const androidMap = new Map<string, Set<string>>();
    for (const l of deepLinks) {
      if (l.appLinksEnabled && l.androidPackageName) {
        if (!androidMap.has(l.androidPackageName)) {
          androidMap.set(l.androidPackageName, new Set());
        }
        for (const fp of l.sha256CertFingerprints ?? []) {
          if (fp.trim()) androidMap.get(l.androidPackageName)!.add(fp.trim());
        }
      }
    }

    for (const [pkg, fingerprints] of androidMap) {
      association.android.push({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: pkg,
          sha256_cert_fingerprints:
            fingerprints.size > 0 ? [...fingerprints] : [],
        },
      });
    }

    return NextResponse.json(association);
  } catch (err) {
    console.error("[GET /api/internal/app-association]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
