import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains, workspaces, cfHostnameStatusEnum, cfSslStatusEnum } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { checkLimit } from "@/lib/billing/usage";
import { billingLimitError } from "@/lib/billing/middleware";
import { cloudflareCustomHostnames } from "@/lib/cloudflare/custom-hostnames";

type CfHostnameStatus = (typeof cfHostnameStatusEnum.enumValues)[number];
type CfSslStatus = (typeof cfSslStatusEnum.enumValues)[number];

const CNAME_TARGET = process.env.CLOUDFLARE_CNAME_TARGET || "links.pivoturl.com";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  try {
    const workspaceDomains = await db.query.domains.findMany({
      where: eq(domains.workspaceId, workspaceId),
      orderBy: [desc(domains.createdAt)],
      with: {
        links: {
          columns: {
            id: true
          }
        }
      }
    });

    // Map to include link count
    const result = workspaceDomains.map(d => ({
      ...d,
      linkCount: d.links.length,
      links: undefined // Don't send all link objects
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/domains]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { workspaceId, domain } = await req.json();

    if (!workspaceId || !domain) {
      return NextResponse.json({ error: "Missing workspaceId or domain" }, { status: 400 });
    }

    // Enforce plan limits for domains per workspace
    const ws = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    if (!ws) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const limitCheck = await checkLimit(workspaceId, 'customDomains', false);
    if (!limitCheck.allowed) {
      return billingLimitError('customDomains', limitCheck.current, limitCheck.limit, ws.plan);
    }

    // Validate domain
    // Must not include http:// or https:// or trailing slashes
    if (domain.includes("http://") || domain.includes("https://") || domain.includes("/")) {
      return NextResponse.json({ error: "Invalid domain format. Do not include http:// or trailing slashes." }, { status: 400 });
    }

    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: "Invalid domain format." }, { status: 400 });
    }

    // Check if domain already exists
    const existing = await db.query.domains.findFirst({
      where: eq(domains.domain, domain),
    });

    if (existing) {
      return NextResponse.json({ error: "Domain is already registered by another workspace." }, { status: 400 });
    }

    const verificationToken = nanoid(24);

    const [newDomain] = await db.insert(domains).values({
      workspaceId,
      domain,
      verificationToken,
      verified: false,
      isDefault: false,
    }).returning();

    let cfHostnameStatus: string | undefined;
    let cfSslStatus: string | undefined;
    let cfError: string | undefined;

    if (cloudflareCustomHostnames.isConfigured()) {
      try {
        const cfHostname = await cloudflareCustomHostnames.create({
          hostname: domain,
          sslMethod: "http",
          customMetadata: {
            workspace_id: workspaceId,
            domain_id: newDomain.id,
          },
        });

        cfHostnameStatus = cfHostname.status;
        cfSslStatus = cfHostname.ssl?.status;

        await db.update(domains).set({
          cfHostnameId: cfHostname.id,
          cfHostnameStatus: cfHostname.status as CfHostnameStatus,
          cfSslStatus: (cfHostname.ssl?.status ?? null) as CfSslStatus | null,
          cfSslMethod: cfHostname.ssl?.method ?? null,
          cfValidationRecords: cfHostname.ssl?.validation_records ?? null,
          cfOwnershipVerification: cfHostname.ownership_verification ?? null,
          cfOwnershipVerificationHttp: cfHostname.ownership_verification_http ?? null,
          cfVerificationErrors: cfHostname.verification_errors ?? null,
          cfSslValidationErrors: cfHostname.ssl?.validation_errors ?? null,
          cfStatusUpdatedAt: new Date(),
        }).where(eq(domains.id, newDomain.id));

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[Cloudflare] Failed to create custom hostname:", err);
        cfError = errorMessage;

        try {
          await db.update(domains).set({
            cfError: errorMessage,
            cfStatusUpdatedAt: new Date(),
          }).where(eq(domains.id, newDomain.id));
        } catch (e2) {
          console.error("[DB] Failed to update CF error:", e2);
        }
      }
    } else {
      console.warn("[Cloudflare] API not configured, skipping hostname creation");
    }

    return NextResponse.json({
      id: newDomain.id,
      domain: newDomain.domain,
      verificationToken: newDomain.verificationToken,
      cnameTarget: CNAME_TARGET,
      txtRecord: `_pivoturl-verify.${newDomain.domain}`,
      cfHostnameStatus,
      cfSslStatus,
      cfError,
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/domains]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
