"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useOrganization, useOrganizationList, useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export type MemberRole = "owner" | "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: MemberRole;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: MemberRole;
  members: WorkspaceMember[];
  isPersonal: boolean;
}

interface WorkspaceContextValue {
  workspace: WorkspaceInfo | null;
  isLoading: boolean;
  refetch: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  isLoading: true,
  refetch: () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { isLoaded: listLoaded } = useOrganizationList();
  const { userId } = useAuth();
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  const { data: workspace, isLoading } = useQuery<WorkspaceInfo | null>({
    queryKey: ["workspace", "context", organization?.id || "personal", refetchKey],
    queryFn: async () => {
      if (!userId) return null;

      const params = organization?.id ? `?orgId=${organization.id}` : "";
      const res = await fetch(`/api/workspaces/current${params}`);
      if (!res.ok) return null;
      const json = await res.json();

      const ws = json.workspace;
      if (!ws) return null;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan || "free",
        role: ws.role || "owner",
        members: ws.members || [],
        isPersonal: !ws.clerkOrgId,
      };
    },
    enabled: !!userId && orgLoaded && listLoaded,
  });

  const value: WorkspaceContextValue = {
    workspace: workspace ?? null,
    isLoading: !userId || isLoading,
    refetch,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
