import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import {
  cloudflareCustomHostnames,
  type CfHostnameStatus,
  type CfSslStatus,
} from "@/lib/cloudflare/custom-hostnames";
import { refreshDomainConfig } from "@/lib/domains/config-sync";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
  }

  try {
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, id),
      with: { workspace: true }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const ws = await resolveUserWorkspace(dbUser.id, domainRecord.workspaceId);
    if (!canAdmin(ws.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!domainRecord.cfHostnameId) {
      return NextResponse.json(
        { error: "No Cloudflare hostname associated with this domain" },
        { status: 400 }
      );
    }

    if (!cloudflareCustomHostnames.isConfigured()) {
      return NextResponse.json(
        { error: "Cloudflare integration is not configured" },
        { status: 503 }
      );
    }

    const revalidated = await cloudflareCustomHostnames.revalidate(domainRecord.cfHostnameId);

    const cfUpdated = await cloudflareCustomHostnames.get(domainRecord.cfHostnameId);

    await db.update(domains).set({
      cfHostnameStatus: cfUpdated.status as CfHostnameStatus,
      cfSslStatus: (cfUpdated.ssl?.status ?? null) as CfSslStatus | null,
      cfSslMethod: cfUpdated.ssl?.method ?? null,
      cfValidationRecords: cfUpdated.ssl?.validation_records ?? null,
      cfOwnershipVerification: cfUpdated.ownership_verification ?? null,
      cfOwnershipVerificationHttp: cfUpdated.ownership_verification_http ?? null,
      cfVerificationErrors: cfUpdated.verification_errors ?? null,
      cfSslValidationErrors: cfUpdated.ssl?.validation_errors ?? null,
      cfStatusUpdatedAt: new Date(),
      cfError: null,
      // If CF hostname and SSL are now active, mark domain as verified
      ...(cfUpdated.status === "active" && cfUpdated.ssl?.status === "active"
        ? { verified: true, updatedAt: new Date() }
        : {}),
    }).where(eq(domains.id, id));

    // Push domain config to worker KV so the edge reflects the latest status
    await refreshDomainConfig(domainRecord.domain);

    return NextResponse.json({
      revalidated: true,
      cfHostnameStatus: cfUpdated.status,
      cfSslStatus: cfUpdated.ssl?.status ?? null,
      message: "SSL revalidation triggered. Check status again in a moment.",
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/domains/:id/revalidate]", err);
    return NextResponse.json(
      { error: "Revalidation failed", details: errorMessage },
      { status: 500 }
    );
  }
}
