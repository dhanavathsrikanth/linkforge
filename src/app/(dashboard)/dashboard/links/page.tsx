import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { getOrCreateDbUser } from "@/lib/auth";
import { LinksDashboardClient } from "@/components/links/LinksDashboardClient";

export const metadata = {
  title: "Links - LinkForge",
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40) || "workspace";
}

export default async function LinksPage() {
  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return <div className="p-6 text-muted-foreground">Loading...</div>;

  let workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.ownerId, dbUser.id),
  });

  if (!workspace) {
    const baseName = dbUser.firstName || dbUser.name || dbUser.email || "My";
    const slug = `${slugify(baseName)}-${dbUser.id.slice(0, 8)}`;
    const [created] = await db
      .insert(workspaces)
      .values({
        name: `${baseName}'s Workspace`,
        slug,
        ownerId: dbUser.id,
        isDefault: true,
      })
      .returning();
    workspace = created;
  }

  if (!workspace) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
        <div className="text-center">
          <h2 className="text-lg font-medium text-slate-950">No workspace found</h2>
          <p className="mt-1 text-sm text-slate-600">Please create a workspace to manage links.</p>
        </div>
      </div>
    );
  }

  const userLinks = await db.query.links.findMany({
    where: (l, { eq }) => eq(l.workspaceId, workspace.id),
    orderBy: (l, { desc }) => [desc(l.createdAt)],
  });

  return (
    <LinksDashboardClient
      workspaceId={workspace.id}
      initialLinks={userLinks as any}
    />
  );
}
