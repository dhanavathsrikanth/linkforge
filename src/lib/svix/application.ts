import { svix } from "./client";

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

export async function getSvixAppPortalUrl(workspaceId: string) {
  const { url } = await svix.authentication.appPortalAccess(workspaceId, {});
  return url;
}
