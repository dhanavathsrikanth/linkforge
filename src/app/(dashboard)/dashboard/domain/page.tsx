"use client";

import { DomainsClient } from "./domain-client";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { Loader2 } from "lucide-react";

export default function DomainsPage() {
  const { workspace, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400">No workspace found.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <DomainsClient workspaceId={workspace.id} />
    </div>
  );
}
