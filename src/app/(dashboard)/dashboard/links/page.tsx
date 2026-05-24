"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery } from "@tanstack/react-query";
import { LinksDashboardClient } from "@/components/links/LinksDashboardClient";
import { FolderItem } from "@/components/dashboard/FolderFilter";

export default function LinksPage() {
  const { workspace, isLoading: wsLoading } = useWorkspace();

  const wsId = workspace?.id;

  const { data: links, isLoading } = useQuery<any[]>({
    queryKey: ["links", wsId],
    queryFn: async () => {
      const res = await fetch(`/api/links?workspaceId=${wsId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.links || [];
    },
    enabled: !!wsId,
  });

  const { data: folders } = useQuery<{ folders: FolderItem[] }>({
    queryKey: ["folders", wsId],
    queryFn: async () => {
      const res = await fetch(`/api/folders?workspaceId=${wsId}`);
      if (!res.ok) return { folders: [] };
      return res.json();
    },
    enabled: !!wsId,
  });

  if (wsLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading links...</div>
      </div>
    );
  }

  if (!wsId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">No workspace found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create a workspace to manage links.</p>
        </div>
      </div>
    );
  }

  return (
    <LinksDashboardClient
      workspaceId={wsId}
      initialLinks={links as any}
      folders={folders?.folders || []}
    />
  );
}
