import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Link {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  description: string | null;
  tags: string[];
  folderId: string | null;
  userId: string;
  workspaceId: string;
  password: string | null;
  expiresAt: string | null;
  scheduledAt: string | null;
  clickLimit: number | null;
  totalClicks: number;
  uniqueClicks: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  iosDestination: string | null;
  androidDestination: string | null;
  abTestEnabled: boolean;
  abTestVariants: AbTestVariant[] | null;
  routingRules: RoutingRule[] | null;
  qrSettings: QRSettings | null;
}

export interface AbTestVariant {
  id: string;
  destination: string;
  weight: number;
  label: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  uniqueClicks: number;
}

export interface RoutingRule {
  condition: {
    device?: string;
    country?: string;
    language?: string;
  };
  destination: string;
}

export interface QRSettings {
  size?: number;
  backgroundColor?: string;
  color?: string;
  logo?: string;
  style?: string;
}

const POLLING_INTERVAL = 30000; // 30 seconds - auto-refresh interval for real-time collaboration

export function useLinks(workspaceId: string, options?: {
  folderId?: string | null;
  tags?: string[];
  enabled?: boolean;
  pollingEnabled?: boolean;
}) {
  const { folderId, tags, enabled = true, pollingEnabled = true } = options || {};

  return useQuery<{ links: Link[]; workspaceId: string }>({
    queryKey: ["links", workspaceId, folderId, tags?.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId });
      if (folderId) params.set("folderId", folderId);
      if (tags && tags.length > 0) params.set("tags", tags.join(","));
      
      const res = await fetch(`/api/links?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch links");
      return res.json();
    },
    enabled: enabled && !!workspaceId,
    refetchInterval: pollingEnabled ? POLLING_INTERVAL : false,
    refetchIntervalInBackground: false,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

export function useFolders(workspaceId: string, options?: {
  enabled?: boolean;
  pollingEnabled?: boolean;
}) {
  const { enabled = true, pollingEnabled = true } = options || {};

  return useQuery<{ folders: Folder[] }>({
    queryKey: ["folders", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/folders?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
    enabled: enabled && !!workspaceId,
    refetchInterval: pollingEnabled ? POLLING_INTERVAL : false,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}

export function useLinkMutations(workspaceId: string) {
  const queryClient = useQueryClient();

  const invalidateLinks = () => {
    queryClient.invalidateQueries({ queryKey: ["links", workspaceId] });
  };

  const invalidateFolders = () => {
    queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] });
  };

  const createLink = useMutation({
    mutationFn: async (data: Partial<Link>) => {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create link");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateLinks();
      invalidateFolders();
    },
  });

  const updateLink = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Link>) => {
      const res = await fetch(`/api/links/${id}?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update link");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateLinks();
      invalidateFolders();
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/links/${id}?workspaceId=${workspaceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete link");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateLinks();
      invalidateFolders();
    },
  });

  const createFolder = useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string; icon?: string }) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create folder");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateFolders();
      invalidateLinks();
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Folder>) => {
      const res = await fetch(`/api/folders/${id}?workspaceId=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update folder");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateFolders();
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/folders/${id}?workspaceId=${workspaceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete folder");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateFolders();
      invalidateLinks();
    },
  });

  return {
    createLink,
    updateLink,
    deleteLink,
    createFolder,
    updateFolder,
    deleteFolder,
    invalidateLinks,
    invalidateFolders,
  };
}

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  workspaceId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  linkCount?: number;
}
