import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Cable, Settings, BarChart3, Pencil, ExternalLink } from "lucide-react";
import { getOrCreateDbUser } from "@/lib/auth";
import { fetchBiosForUser } from "@/lib/bio/page-data";

export const metadata = { title: "Link in Bio — Pages" };

function getAppDomain(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "https://pivoturl.com";
  try {
    return new URL(url).host;
  } catch {
    return "pivoturl.com";
  }
}

export default async function BioListPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) redirect("/sign-in");

  const bios = await fetchBiosForUser(dbUser.id);
  const appDomain = getAppDomain();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pivoturl.com";

  if (bios.length === 0) {
    redirect("/dashboard/bio/new");
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Link in Bio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your bio pages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/bio/integrations"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors"
          >
            <Cable className="w-4 h-4" />
            Integrations
          </Link>
          <Link
            href="/dashboard/bio/new"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New page</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Mobile Integrations link */}
      <Link
        href="/dashboard/bio/integrations"
        className="sm:hidden flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-colors"
      >
        <Cable className="w-4 h-4 text-muted-foreground" />
        <span>Integrations</span>
        <span className="ml-auto text-xs text-muted-foreground">Connect accounts</span>
      </Link>

      {/* Table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_90px_70px_90px_120px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Page</span>
          <span>Status</span>
          <span>Blocks</span>
          <span>Updated</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {bios.map((bio) => {
            const liveUrl = bio.customDomain
              ? `https://${bio.customDomain}`
              : `${appUrl}/p/${bio.slug}`;
            const shortUrl = bio.customDomain
              ? bio.customDomain
              : `${appDomain}/p/${bio.slug}`;

            return (
              <div
                key={bio.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_90px_70px_90px_120px] gap-2 sm:gap-3 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                {/* Page name + URL */}
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/bio/${bio.id}/edit`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {bio.displayName || "Untitled page"}
                  </Link>
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/url inline-flex items-center gap-1 text-xs text-muted-foreground font-mono truncate mt-0.5 hover:text-foreground transition-colors"
                    title="View live page"
                  >
                    <span className="truncate hover:underline">{shortUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60 group-hover/url:opacity-100 transition-opacity" />
                  </a>
                </div>

                {/* Status */}
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      bio.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        bio.isPublished ? "bg-green-500" : "bg-muted-foreground/50"
                      }`}
                    />
                    {bio.isPublished ? "Live" : "Draft"}
                  </span>
                </div>

                {/* Blocks */}
                <div className="text-xs text-muted-foreground tabular-nums">
                  {bio.blockCount}
                </div>

                {/* Updated */}
                <div className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(bio.updatedAt)}
                </div>

                {/* Actions — Analytics, Edit, Settings */}
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/bio/${bio.id}/analytics`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                    title="Analytics"
                    aria-label="Analytics"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/bio/${bio.id}/edit`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/bio/${bio.id}/settings`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
                    title="Settings"
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
