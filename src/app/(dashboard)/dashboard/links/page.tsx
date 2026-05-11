import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CreateLinkModal } from "@/components/links/CreateLinkModal";
import { LinkCard } from "@/components/links/LinkCard";

export const metadata = {
  title: "Links - LinkForge",
};

export default async function LinksPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  // Get the user's first workspace (or default)
  // In a real app, this would be determined by the URL or a cookie
  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.ownerId, userId),
  });

  if (!workspace) {
    // Should handle no workspace state
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#09090b]">
        <div className="text-center">
          <h2 className="text-lg font-medium text-white">No workspace found</h2>
          <p className="mt-1 text-sm text-zinc-400">Please create a workspace to manage links.</p>
        </div>
      </div>
    );
  }

  // Fetch links for this workspace
  const userLinks = await db.query.links.findMany({
    where: (l, { eq }) => eq(l.workspaceId, workspace.id),
    orderBy: (l, { desc }) => [desc(l.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Links</h1>
          <p className="text-sm text-zinc-400">Manage your short links and track their performance.</p>
        </div>
        <CreateLinkModal workspaceId={workspace.id} />
      </div>

      {userLinks.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#141418]/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 mb-4">
            <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No links created</h3>
          <p className="text-sm text-zinc-400 max-w-sm text-center mb-6">
            You haven't created any short links yet. Create your first link to start tracking clicks.
          </p>
          <CreateLinkModal workspaceId={workspace.id} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {userLinks.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
