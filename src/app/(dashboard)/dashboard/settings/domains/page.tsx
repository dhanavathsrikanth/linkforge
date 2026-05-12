import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DomainsClient } from "./domain-client";

export const metadata = {
  title: "Custom Domains - LinkForge",
};

export default async function DomainsPage() {
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
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50">
        <div className="text-center">
          <h2 className="text-lg font-medium text-white">No workspace found</h2>
          <p className="mt-1 text-sm text-slate-400">Please create a workspace to manage domains.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <DomainsClient workspaceId={workspace.id} />
    </div>
  );
}
