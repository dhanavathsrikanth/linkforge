"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";
import { AnalyticsClient } from "./AnalyticsClient";

export default function AnalyticsPage() {
  const { workspace, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!workspace?.id) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">No workspace found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a workspace to view analytics.</p>
        </div>
      </div>
    );
  }

  return <AnalyticsClient workspaceId={workspace.id} />;
}
