import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { links, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { LinkAnalyticsClient } from "./LinkAnalyticsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Link Analytics - LinkForge",
};

export default async function LinkAnalyticsPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const { id } = await params;

  // Get the link
  const link = await db.query.links.findFirst({
    where: eq(links.id, id),
  });

  if (!link) {
    notFound();
  }

  // Get the workspace
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, link.workspaceId),
  });

  if (!workspace || workspace.ownerId !== userId) {
    redirect("/dashboard");
  }

  return <LinkAnalyticsClient linkId={id} workspaceId={workspace.id} />;
}