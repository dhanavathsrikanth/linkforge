"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useQuery } from "@tanstack/react-query";
import { LinksDashboardClient } from "@/components/links/LinksDashboardClient";
import { useEffect, useState } from "react";

export default function LinksPage() {
  const { workspace, isLoading: wsLoading } = useWorkspace();
  const [initialLinks, setInitialLinks] = useState<any[]>([]);

  const wsId = workspace?.id;

  const { data: linksData, isLoading } = useQuery<any[]>({
    queryKey: ["links", wsId],
    queryFn: async () => {
      const res = await fetch(`/api/links?workspaceId=${wsId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.links || [];
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

  const links = linksData || initialLinks;

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
    />
  );
}
