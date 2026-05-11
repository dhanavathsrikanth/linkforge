import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, users, domains } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { AlertCircle, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import { DomainVerification } from "@/components/dashboard/DomainVerification";

export const metadata = {
  title: "Settings - LinkForge",
};

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.clerkId, userId),
  });

  if (!user) {
    redirect("/login");
  }

  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.ownerId, user.id),
  });

  const activeDomain = workspace?.customDomain 
    ? await db.query.domains.findFirst({
        where: and(eq(domains.workspaceId, workspace.id), eq(domains.domain, workspace.customDomain)),
      })
    : null;

  if (!workspace) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#09090b]">
        <h2 className="text-lg font-medium text-white">No workspace found</h2>
      </div>
    );
  }

  async function updateWorkspace(formData: FormData) {
    "use server";
    
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const currentUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.clerkId, userId),
    });
    if (!currentUser) throw new Error("User not found");

    const currentWorkspace = await db.query.workspaces.findFirst({
      where: (w, { eq }) => eq(w.ownerId, currentUser.id),
    });
    if (!currentWorkspace) throw new Error("Workspace not found");

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const customDomain = formData.get("customDomain") as string;

    if (!name || !slug) return;

    // Handle domain changes
    if (customDomain && customDomain !== currentWorkspace.customDomain) {
      // Check if domain already exists in domains table
      const existingDomain = await db.query.domains.findFirst({
        where: eq(domains.domain, customDomain),
      });

      if (!existingDomain) {
        await db.insert(domains).values({
          workspaceId: currentWorkspace.id,
          domain: customDomain,
          verificationToken: `lf_${nanoid(24)}`,
          verified: false,
        });
      }
    }

    await db
      .update(workspaces)
      .set({
        name,
        slug,
        customDomain: customDomain || null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, currentWorkspace.id));

    revalidatePath("/dashboard/settings");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-zinc-400">Manage your workspace and domains.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#141418] shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-medium text-white">Workspace General</h2>
          <p className="text-sm text-zinc-400 mt-1">Update your workspace details and custom domains.</p>
        </div>
        
        <form action={updateWorkspace} className="p-6 space-y-6">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium text-zinc-300">Workspace Name</label>
            <input 
              id="name"
              name="name"
              type="text" 
              defaultValue={workspace.name}
              required
              className="w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="slug" className="text-sm font-medium text-zinc-300">Workspace Slug</label>
            <div className="flex rounded-lg border border-white/10 bg-[#09090b] focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-colors">
              <span className="flex items-center px-4 border-r border-white/10 text-zinc-500 text-sm bg-white/5 rounded-l-lg">
                linkforge.com/
              </span>
              <input 
                id="slug"
                name="slug"
                type="text" 
                defaultValue={workspace.slug}
                required
                className="w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="customDomain" className="text-sm font-medium text-zinc-300">
              Custom Domain <span className="text-xs text-violet-400 font-normal ml-2">Pro Plan Required</span>
            </label>
            <input 
              id="customDomain"
              name="customDomain"
              type="text" 
              defaultValue={workspace.customDomain || ""}
              placeholder="links.yourdomain.com"
              disabled={workspace.plan === "free"}
              className="w-full rounded-lg border border-white/10 bg-[#09090b] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 transition-colors"
            />
            {workspace.plan === "free" && (
              <p className="text-xs text-zinc-500">Upgrade your plan to use a custom domain for your links.</p>
            )}

            {activeDomain && (
              <DomainVerification 
                domainId={activeDomain.id}
                domainName={activeDomain.domain}
                token={activeDomain.verificationToken || ""}
                isVerified={activeDomain.verified || false}
              />
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              Changes may take a few minutes to propagate across the edge network.
            </p>
            <button 
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#141418]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-red-500/20 bg-red-500/5 shadow-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-red-400">Danger Zone</h2>
          <p className="text-sm text-zinc-400 mt-1">Permanently delete your workspace and all associated data.</p>
          
          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Delete Workspace</p>
              <p className="text-sm text-zinc-500">This action cannot be undone.</p>
            </div>
            <button 
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#141418]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
