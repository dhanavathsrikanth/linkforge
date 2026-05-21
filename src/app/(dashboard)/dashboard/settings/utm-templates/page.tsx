"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery } from "@tanstack/react-query";
import { UTMTemplatesClient } from "./UTMTemplatesClient";

export default function UTMTemplatesPage() {
  const { workspace, isLoading } = useWorkspace();

  const { data: initialTemplates } = useQuery<any[]>({
    queryKey: ["utm-templates", workspace?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/utm-templates?workspaceId=${workspace!.id}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.templates || [];
    },
    enabled: !!workspace?.id,
  });

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
          <p className="mt-1 text-sm text-muted-foreground">Create a workspace to manage UTM templates.</p>
        </div>
      </div>
    );
  }

  return <UTMTemplatesClient workspaceId={workspace.id} initialTemplates={initialTemplates || []} />;
}
