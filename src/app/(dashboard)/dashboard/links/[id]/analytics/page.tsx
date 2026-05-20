import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { links, workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { LinkAnalyticsClient } from "./LinkAnalyticsClient";
import { getOrCreateDbUser } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Link Analytics - LinkForge",
};

export default async function LinkAnalyticsPage({ params }: PageProps) {
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const { id } = await params;

  const link = await db.query.links.findFirst({
    where: eq(links.id, id),
  });

  if (!link) {
    notFound();
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, link.workspaceId),
  });

  if (!workspace) {
    notFound();
  }

  if (workspace.ownerId !== dbUser.id) {
    const [membership] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspace.id),
          eq(workspaceMembers.userId, dbUser.id)
        )
      )
      .limit(1);
    if (!membership) {
      notFound();
    }
  }

  return <LinkAnalyticsClient linkId={id} workspaceId={workspace.id} />;
}