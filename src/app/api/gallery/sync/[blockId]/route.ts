import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { linkGalleryBlocks, linkGalleryIntegrations } from "@/lib/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshToken } from "@/lib/gallery/oauth";
import type { IntegrationConfig } from "@/lib/gallery/integrations";
import { getBlockSyncFn } from "@/lib/gallery/sync";

// GET /api/gallery/sync/[blockId] — sync live data for a block's integration
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const { blockId } = await params;

  const block = await db.query.linkGalleryBlocks.findFirst({
    where: eq(linkGalleryBlocks.id, blockId),
  });
  if (!block) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  const syncFn = getBlockSyncFn(block.type);
  if (!syncFn) return NextResponse.json({ error: `Block type ${block.type} has no sync handler` }, { status: 400 });

  // Check if block is linked to an integration
  if (!block.integrationId) {
    // No integration linked — return cached data if any, empty otherwise
    return NextResponse.json({ ...(block.data as Record<string, unknown>), syncedAt: null });
  }

  const integration = await db.query.linkGalleryIntegrations.findFirst({
    where: eq(linkGalleryIntegrations.id, block.integrationId),
  });
  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  // Decrypt tokens
  let tokenSet: IntegrationConfig["tokens"];
  try {
    const config: IntegrationConfig = JSON.parse(decrypt(integration.encryptedConfig!));
    tokenSet = config.tokens;
  } catch {
    return NextResponse.json({ error: "Failed to decrypt integration tokens" }, { status: 500 });
  }

  // For unauthenticated requests, return cached data without fresh sync
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({
      ...(block.data as Record<string, unknown>),
      _cached: true,
    });
  }

  // Check expiration and refresh if needed
  if (tokenSet.expiresAt && tokenSet.expiresAt < Date.now() && tokenSet.refreshToken) {
    try {
      tokenSet = await refreshToken(integration.type as any, tokenSet);
      const existing = JSON.parse(decrypt(integration.encryptedConfig!));
      await db
        .update(linkGalleryIntegrations)
        .set({
          encryptedConfig: encrypt(JSON.stringify({ ...existing, tokens: tokenSet })),
          updatedAt: new Date(),
        })
        .where(eq(linkGalleryIntegrations.id, integration.id));
    } catch (err) {
      console.error(`[Sync] Token refresh failed for ${integration.type}:`, err);
      return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
    }
  }

  // Fetch fresh data from provider
  let syncedData: Record<string, unknown>;
  try {
    syncedData = await syncFn(tokenSet.accessToken);
  } catch (err) {
    console.error(`[Sync] Failed to sync ${block.type}:`, err);
    return NextResponse.json({ error: "Sync failed", detail: String(err) }, { status: 502 });
  }

  // Persist to DB
  await db
    .update(linkGalleryBlocks)
    .set({ data: syncedData, updatedAt: new Date() })
    .where(eq(linkGalleryBlocks.id, blockId));

  return NextResponse.json(syncedData);
}
