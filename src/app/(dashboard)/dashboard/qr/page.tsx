import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { QRCodesClient } from "@/components/qr/QRCodesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Codes — LinkForge",
  description: "Generate and customize QR codes for all your short links.",
};

export default async function QRCodesPage() {
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const userLinks = await db.query.links.findMany({
    where: (l, { eq }) => eq(l.userId, dbUser.id),
    orderBy: (l, { desc }) => [desc(l.createdAt)],
    limit: 200,
    columns: {
      id: true,
      slug: true,
      destination: true,
      title: true,
      totalClicks: true,
      qrSettings: true,
    },
  });

  // Serialise dates so they can cross the server→client boundary
  const links = userLinks.map((l) => ({
    ...l,
    qrSettings: l.qrSettings ?? null,
  }));

  return <QRCodesClient links={links} />;
}
