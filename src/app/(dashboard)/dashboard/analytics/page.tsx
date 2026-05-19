import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata = {
  title: "Analytics - LinkForge",
};

export default async function AnalyticsPage() {
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return <div className="p-6 text-muted-foreground">Loading...</div>;

  // Get user's workspace
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerId, dbUser.id),
  });

  if (!workspace) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
        <h2 className="text-lg font-medium text-slate-950">No workspace found</h2>
      </div>
    );
  }

  return <AnalyticsClient workspaceId={workspace.id} />;
}
