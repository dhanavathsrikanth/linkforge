import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatar: string | null;
  plan: "free" | "starter" | "growth" | "agency" | "business" | "enterprise";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  customDomain: string | null;
  isDefault: boolean;
  plan: "free" | "starter" | "growth" | "agency" | "business" | "enterprise";
  role: "owner" | "admin" | "editor" | "viewer";
}

interface UserResponse {
  user: User;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
}

export function useUser() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<UserResponse>({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await fetch("/api/user/me");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    },
    enabled: isLoaded && isSignedIn && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
  });

  return {
    user: data?.user,
    workspaces: data?.workspaces || [],
    currentWorkspace: data?.currentWorkspace,
    isLoading,
    error,
    isAuthenticated: isLoaded && isSignedIn,
    refetch,
  };
}

export function useCurrentUser() {
  const { user, isLoading, error } = useUser();
  
  return {
    user,
    isLoading,
    error,
    isLoggedIn: !!user,
  };
}

export function useWorkspace() {
  const { currentWorkspace, workspaces, isLoading, error } = useUser();
  
  return {
    workspace: currentWorkspace,
    workspaces,
    isLoading,
    error,
    hasWorkspaces: workspaces.length > 0,
  };
}

export function usePlan() {
  const { user, isLoading } = useUser();
  
  return {
    plan: user?.plan || "free",
    isLoading,
    isFree: user?.plan === "free" || !user,
    isPaid: user?.plan !== "free" && !!user,
  };
}
