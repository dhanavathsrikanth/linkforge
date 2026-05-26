import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { QRCodesClient } from "@/components/qr/QRCodesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Codes — PivotUrl",
  description: "Generate and customize QR codes for all your short links.",
};

type Props = {
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function QRCodesPage(props: Props) {
  const searchParams = await props.searchParams;
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return <div className="p-6 text-muted-foreground">Loading...</div>;

  // Resolve workspace
  let workspaceId: string | undefined;
  if (searchParams.workspaceId) {
    const [ws] = await db
      .select({ id: workspaces.id, ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, searchParams.workspaceId))
      .limit(1);
    if (ws) {
      if (ws.ownerId === dbUser.id) {
        workspaceId = ws.id;
      } else {
        const [membership] = await db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, ws.id),
              eq(workspaceMembers.userId, dbUser.id)
            )
          )
          .limit(1);
        if (membership) workspaceId = ws.id;
      }
    }
  }

  if (!workspaceId) {
    const [ws] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.ownerId, dbUser.id))
      .limit(1);
    workspaceId = ws?.id;
  }

  const userLinks = workspaceId
    ? await db.query.links.findMany({
        where: (l, { eq: eqFn }) => eqFn(l.workspaceId, workspaceId),
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
      })
    : [];

  const serialized = userLinks.map((l) => ({
    ...l,
    qrSettings: l.qrSettings ?? null,
  }));

  return <QRCodesClient links={serialized} />;
}
