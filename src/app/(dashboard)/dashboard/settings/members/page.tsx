"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";

export default function MembersPage() {
  const { workspace, isLoading, refetch } = useWorkspace();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading members...</div>;
  }

  if (!workspace) {
    return <div className="text-sm text-muted-foreground">No workspace found.</div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-foreground mb-1">Workspace Members</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {workspace.isPersonal
          ? "This is your personal workspace. Create an organization in settings to invite team members."
          : `${workspace.name} has ${workspace.members.length} member${workspace.members.length === 1 ? "" : "s"}.`}
      </p>

      {workspace.isPersonal ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Create an organization from your
          {" "}
          <a href="/dashboard/settings" className="text-primary hover:underline">settings</a>
          {" "}to manage team members.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody>
              {workspace.members.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {member.user?.avatar ? (
                        <img src={member.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">
                          {member.user?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.user?.email || ""}
                        </div>
                      </div>
                    </div>
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
        </div>
      )}
    </div>
  );
}
