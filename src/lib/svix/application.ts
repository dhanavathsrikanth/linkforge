import { svix } from "./client";
import type { AppPortalCapability, ApplicationIn } from "svix";

export type AppPortalOptions = {
  featureFlags?: string[];
  sessionId?: string;
  capabilities?: AppPortalCapability[];
  expiry?: number;
  application?: ApplicationIn;
  primaryColorLight?: string;
  primaryColorDark?: string;
  icon?: string;
  fontFamily?: string;
  darkMode?: "false" | "true" | "auto";
  hideNavigation?: boolean;
  noGutters?: boolean;
  next?: string;
};

export async function createSvixApp(workspaceId: string, workspaceName: string) {
  const app = await svix.application.create({
    uid: workspaceId,
    name: workspaceName,
    rateLimit: 100,
  });
  return app;
}

export async function deleteSvixApp(workspaceId: string) {
  try {
    await svix.application.delete(workspaceId);
  } catch {
    // App may not exist — that's fine
  }
}

export async function getSvixAppPortalUrl(
  workspaceId: string,
  options: AppPortalOptions = {}
) {
  const { featureFlags, sessionId, capabilities, expiry, application, ...styling } = options;

  const { url } = await svix.authentication.appPortalAccess(
    workspaceId,
    {
      featureFlags,
      sessionId,
      capabilities,
      expiry,
      application,
    },
  );

  const searchParams = new URLSearchParams();
  if (styling.primaryColorLight) searchParams.set("primaryColorLight", styling.primaryColorLight);
  if (styling.primaryColorDark) searchParams.set("primaryColorDark", styling.primaryColorDark);
  if (styling.icon) searchParams.set("icon", styling.icon);
  if (styling.fontFamily) searchParams.set("fontFamily", styling.fontFamily);
  if (styling.darkMode) searchParams.set("darkMode", styling.darkMode);
  if (styling.hideNavigation) searchParams.set("hideNavigation", "true");
  if (styling.noGutters) searchParams.set("noGutters", "true");
  if (styling.next) searchParams.set("next", styling.next);

  const queryString = searchParams.toString();
  if (!queryString) return url;

  const parsed = new URL(url);
  searchParams.forEach((value, key) => parsed.searchParams.set(key, value));
  return parsed.toString();
}

export async function expireAllSessions(
  workspaceId: string,
  options?: { sessionIds?: string[]; expiry?: number },
) {
  await svix.authentication.expireAll(workspaceId, options ?? {});
}
