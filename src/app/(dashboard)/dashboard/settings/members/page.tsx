"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useOrganization } from "@clerk/nextjs";
import { Users, Copy, Check } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import Link from "next/link";

export default function MembersPage() {
  const { workspace, isLoading } = useWorkspace();
  const { organization } = useOrganization();
  const { copied, copy } = useClipboard();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading members...</div>;
  }

  if (!workspace) {
    return <div className="text-sm text-muted-foreground">No workspace found.</div>;
  }

  const isPersonal = workspace.isPersonal || !organization;
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const orgSlug = organization?.slug;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPersonal
              ? "Create an organization to invite team members"
              : `Manage your team and organization settings`}
          </p>
        </div>
        {!isPersonal && canManage && (
          <Link
            href="/organization-profile"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Users className="h-4 w-4" />
            Manage Team
          </Link>
        )}
      </div>

      {isPersonal ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">No team yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Create an organization to collaborate with your team members. 
            You can invite people via email and assign different roles.
          </p>
          <Link
            href="/create-organization"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Users className="h-4 w-4" />
            Create Organization
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Organization Info Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-xl font-bold text-primary">
                  {organization.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">{organization.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {organization.membersCount} {organization.membersCount === 1 ? "member" : "members"}
                </p>
                {orgSlug && (
                  <div className="flex items-center gap-2 mt-3">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      linkforge.app/{orgSlug}
                    </code>
                    <button
                      onClick={() => copy(`linkforge.app/${orgSlug}`)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {canManage && <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/organization-profile"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/50 transition-all"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground">Manage Members</div>
                <div className="text-xs text-muted-foreground">Invite, remove, or change roles</div>
              </div>
            </Link>

            <Link
              href="/organization-profile"
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/50 transition-all"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/20">
                <svg className="h-5 w-5 text-secondary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-foreground">Organization Settings</div>
                <div className="text-xs text-muted-foreground">Name, logo, and preferences</div>
              </div>
            </Link>
          </div>}

          {/* Members List Preview */}
          {workspace.members && workspace.members.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <h3 className="text-sm font-medium text-foreground">Synced Members</h3>
                <p className="text-xs text-muted-foreground">Members synced from Clerk to your database</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {workspace.members.slice(0, 5).map((member) => (
                    <tr key={member.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.user?.avatar ? (
                            <img src={member.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                              {member.user?.name?.charAt(0) || member.email?.charAt(0) || "?"}
                            </div>
                          )}
                          <div className="font-medium text-foreground">
                            {member.user?.name || "Unknown"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.email || member.user?.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                          {member.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workspace.members.length > 5 && (
                <div className="px-4 py-2 text-center border-t border-border">
                  <Link href="/organization-profile" className="text-xs text-primary hover:underline">
                    View all {workspace.members.length} members →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
