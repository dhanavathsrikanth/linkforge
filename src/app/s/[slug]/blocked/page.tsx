import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BlockedInterstitial } from "./BlockedInterstitial";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Warning — this link may be unsafe — ${slug}`,
    robots: { index: false, follow: false },
  };
}

export default async function BlockedLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const link = await db.query.links.findFirst({
    where: (l, { eq, and, isNull }) =>
      and(eq(l.slug, slug), isNull(l.domainId)),
    columns: {
      id: true,
      slug: true,
      destination: true,
      safetyStatus: true,
      safetyVerdict: true,
      safetyScannedAt: true,
      safetyBlockedByAdmin: true,
    },
  });

  if (!link) notFound();

  // Only render the warning when the link is actually flagged. If a user
  // hits this URL directly for a safe link, send them to /404.
  const isFlagged =
    link.safetyStatus === "malicious" || link.safetyBlockedByAdmin;
  if (!isFlagged) notFound();

  let destinationHost = link.destination;
  try {
    destinationHost = new URL(link.destination).host;
  } catch {
    /* keep raw */
  }

  const verdict = link.safetyVerdict as
    | {
        categories?: string[];
        phishing?: string[];
        domain?: string;
        country?: string;
        asn?: string;
        asnName?: string;
      }
    | null;

  return (
    <BlockedInterstitial
      slug={link.slug}
      destination={link.destination}
      destinationHost={destinationHost}
      reason={
        link.safetyBlockedByAdmin
          ? "blocked-by-owner"
          : "flagged-malicious"
      }
      categories={verdict?.categories ?? []}
      phishing={verdict?.phishing ?? []}
      asn={verdict?.asn ?? null}
      asnName={verdict?.asnName ?? null}
      country={verdict?.country ?? null}
      scannedAt={link.safetyScannedAt}
    />
  );
}
