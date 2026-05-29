import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { linkGallery, linkGalleryIntegrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { encrypt, decrypt } from "@/lib/crypto";
import { buildAuthorizeUrl, getOAuthConfig } from "@/lib/gallery/oauth";
import { getProvider, type IntegrationType, type IntegrationConfig } from "@/lib/gallery/integrations";

// GET /api/gallery/integrations — list all integrations for the user's gallery
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { eq }) => eq(g.userId, dbUser.id),
  });
  if (!gallery) return NextResponse.json({ integrations: [] });

  const integrations = await db
    .select()
    .from(linkGalleryIntegrations)
    .where(eq(linkGalleryIntegrations.galleryId, gallery.id));

  // Filter out pending rows that don't yet have real tokens. The POST
  // endpoint creates a placeholder row at OAuth-initiation time so the
  // callback has somewhere to store the verified state — those rows
  // shouldn't be reported as "connected" until the OAuth callback has
  // populated the actual access token.
  const connected = integrations.filter((i) => {
    if (!i.encryptedConfig) return false;
    try {
      const cfg = JSON.parse(decrypt(i.encryptedConfig)) as {
        tokens?: { accessToken?: string };
        state?: string;
      };
      return Boolean(cfg.tokens?.accessToken && cfg.tokens.accessToken.length > 0);
    } catch {
      // Corrupt row — surface it as not connected so the user can
      // re-initiate the OAuth flow.
      return false;
    }
  });

  // Decorate with provider metadata, strip encryptedConfig
  const result = connected.map((i) => {
    const provider = getProvider(i.type);
    return {
      id: i.id,
      type: i.type,
      displayName: i.displayName || provider?.label || i.type,
      provider,
      createdAt: i.createdAt,
    };
  });

  return NextResponse.json({ integrations: result });
}

// POST /api/gallery/integrations — initiate OAuth flow for a provider
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  let body: { type: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type } = body;
  const provider = getProvider(type);
  if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  if (!getOAuthConfig(type)) {
    return NextResponse.json({ error: `${type} OAuth is not configured` }, { status: 501 });
  }

  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { eq }) => eq(g.userId, dbUser.id),
  });
  if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

  // Look for an existing row for this provider. If it has a real
  // access token, the user is already connected and we surface the
  // 409 so they disconnect explicitly. If it's a pending placeholder
  // (no real token), we reuse it — this happens when the user
  // initiates OAuth, dismisses the popup, and clicks Connect again.
  const existing = await db.query.linkGalleryIntegrations.findFirst({
    where: and(
      eq(linkGalleryIntegrations.galleryId, gallery.id),
      eq(linkGalleryIntegrations.type, type)
    ),
  });

  let isReusingPending = false;
  if (existing) {
    let hasRealToken = false;
    try {
      const cfg = JSON.parse(decrypt(existing.encryptedConfig!)) as {
        tokens?: { accessToken?: string };
      };
      hasRealToken = Boolean(
        cfg.tokens?.accessToken && cfg.tokens.accessToken.length > 0
      );
    } catch {
      // Treat un-decryptable rows as stale and overwrite
      hasRealToken = false;
    }
    if (hasRealToken) {
      return NextResponse.json(
        { error: `${provider.label} is already connected` },
        { status: 409 }
      );
    }
    isReusingPending = true;
  }

  const state = nanoid(32);
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gallery/integrations/callback/${type}`;

  // Refresh the pending state so the OAuth callback finds the right
  // `state` value when verifying. Either insert fresh or update the
  // stale placeholder we found above.
  const pendingConfig: IntegrationConfig = { tokens: { accessToken: "" }, state };
  if (isReusingPending && existing) {
    await db
      .update(linkGalleryIntegrations)
      .set({
        encryptedConfig: encrypt(JSON.stringify(pendingConfig)),
        updatedAt: new Date(),
      })
      .where(eq(linkGalleryIntegrations.id, existing.id));
  } else {
    await db.insert(linkGalleryIntegrations).values({
      galleryId: gallery.id,
      type,
      displayName: provider.label,
      encryptedConfig: encrypt(JSON.stringify(pendingConfig)),
    });
  }

  const url = buildAuthorizeUrl(type as IntegrationType, state, redirectUri);
  if (!url) return NextResponse.json({ error: "Failed to build auth URL" }, { status: 500 });

  return NextResponse.json({ url });
}
