import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { links, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  if (!workspace || workspace.ownerId !== dbUser.id) {
    notFound();
  }

  return <LinkAnalyticsClient linkId={id} workspaceId={workspace.id} />;
}