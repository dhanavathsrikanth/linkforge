import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGalleryIntegrations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/gallery/oauth";
import { type IntegrationType, type IntegrationConfig } from "@/lib/gallery/integrations";
import { decrypt } from "@/lib/crypto";

// GET /api/gallery/integrations/callback/[type] — OAuth callback handler
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const { searchParams } = new URL(_req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/bio?integration=error&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/dashboard/bio?integration=invalid&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Find the pending integration for this type
  const [integration] = await db
    .select()
    .from(linkGalleryIntegrations)
    .where(and(eq(linkGalleryIntegrations.type, type)))
    .orderBy(linkGalleryIntegrations.createdAt)
    .limit(1);

  if (!integration) {
    return NextResponse.redirect(
      new URL(`/dashboard/bio?integration=notfound&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Verify state
  let config: IntegrationConfig;
  try {
    config = JSON.parse(decrypt(integration.encryptedConfig!));
  } catch {
    return NextResponse.redirect(
      new URL(`/dashboard/bio?integration=invalid_state&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  if (config.state !== state) {
    return NextResponse.redirect(
      new URL(`/dashboard/bio?integration=bad_state&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Exchange code for tokens
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/gallery/integrations/callback/${type}`;
  let tokenSet;
  try {
    tokenSet = await exchangeCode(type as IntegrationType, code, redirectUri);
  } catch (err) {
    console.error(`[OAuth Callback] Token exchange failed for ${type}:`, err);
    return NextResponse.redirect(
      new URL(`/dashboard/bio?integration=token_exchange_failed&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Update integration with real tokens
  const updatedConfig: IntegrationConfig = { tokens: tokenSet };
  await db
    .update(linkGalleryIntegrations)
    .set({
      encryptedConfig: encrypt(JSON.stringify(updatedConfig)),
      updatedAt: new Date(),
    })
    .where(eq(linkGalleryIntegrations.id, integration.id));

  return NextResponse.redirect(
    new URL(`/dashboard/bio?integration=success&provider=${type}`, process.env.NEXT_PUBLIC_APP_URL)
  );
}
