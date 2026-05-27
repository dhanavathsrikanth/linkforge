import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains, cfHostnameStatusEnum, cfSslStatusEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import {
  cloudflareCustomHostnames,
  type CfHostnameStatus,
  type CfSslStatus,
} from "@/lib/cloudflare/custom-hostnames";

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

    let txtVerified = domainRecord.verified;
    let cfHostnameStatus = domainRecord.cfHostnameStatus;
    let cfSslStatus = domainRecord.cfSslStatus;
    let cfError: string | null = domainRecord.cfError || null;
    let verificationErrors: string[] | null = domainRecord.cfVerificationErrors || null;
    let sslValidationErrors: Array<{ message?: string }> | null =
      domainRecord.cfSslValidationErrors || null;
    let actionableMessage: string | null = null;
    let userMessage = "";

    //
    // Step 1: Check OUR TXT record (ownership verification) - if not already verified
    //
    if (!txtVerified && domainRecord.verificationToken) {
      const txtRecordName = `_pivoturl-verify.${domainRecord.domain}`;
      const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtRecordName)}&type=TXT`;

      try {
        const dnsRes = await fetch(dnsUrl, {
          headers: { "Accept": "application/dns-json" }
        });

        if (dnsRes.ok) {
          const dnsData = await dnsRes.json();
          if (dnsData.Status === 0 && dnsData.Answer) {
            for (const record of dnsData.Answer) {
              const data = record.data.replace(/^"|"$/g, "");
              if (data === domainRecord.verificationToken) {
                txtVerified = true;
                break;
              }
            }
          }
        }
      } catch (dnsErr) {
        console.warn("[DNS] Lookup failed:", dnsErr);
      }
    }

    //
    // Step 2: Check Cloudflare SSL for SaaS status
    //
    if (domainRecord.cfHostnameId && cloudflareCustomHostnames.isConfigured()) {
      try {
        const cfHostname = await cloudflareCustomHostnames.get(domainRecord.cfHostnameId);
        cfHostnameStatus = cfHostname.status as CfHostnameStatus;
        cfSslStatus = (cfHostname.ssl?.status ?? null) as CfSslStatus | null;
        cfError = null;
        verificationErrors = cfHostname.verification_errors ?? null;
        sslValidationErrors = cfHostname.ssl?.validation_errors ?? null;

        await db.update(domains).set({
          cfHostnameStatus: cfHostname.status as CfHostnameStatus,
          cfSslStatus: (cfHostname.ssl?.status ?? null) as CfSslStatus | null,
          cfSslMethod: cfHostname.ssl?.method ?? null,
          cfValidationRecords: cfHostname.ssl?.validation_records ?? null,
          cfOwnershipVerification: cfHostname.ownership_verification ?? null,
          cfOwnershipVerificationHttp: cfHostname.ownership_verification_http ?? null,
          cfVerificationErrors: cfHostname.verification_errors ?? null,
          cfSslValidationErrors: cfHostname.ssl?.validation_errors ?? null,
          cfStatusUpdatedAt: new Date(),
          cfError: null,
        }).where(eq(domains.id, id));

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[Cloudflare] Status check failed:", err);
        cfError = errorMessage;
      }
    }

    //
    // Step 3: Determine final verified state
    //
    const cfConfigured = !!domainRecord.cfHostnameId && cloudflareCustomHostnames.isConfigured();
    const cfActive = cfHostnameStatus === "active";
    const cfSslActive = cfSslStatus === "active";

    const fullyVerified = txtVerified && (!cfConfigured || (cfActive && cfSslActive));

    //
    // Step 4: Build user-friendly messages
    //
    if (fullyVerified) {
      if (!domainRecord.verified) {
        await db.update(domains).set({
          verified: true,
          updatedAt: new Date(),
        }).where(eq(domains.id, id));
      }
      userMessage = "Domain verified successfully! SSL is active and ready.";

    } else if (!txtVerified) {
      userMessage = "Ownership not verified yet. Please add the TXT record at your DNS provider.";
      actionableMessage = `Add TXT record: _pivoturl-verify.${domainRecord.domain} → ${domainRecord.verificationToken}`;

    } else if (!cfActive && cfConfigured) {
      switch (cfHostnameStatus) {
        case "pending":
        case "pending_migration":
        case "pending_provisioned":
        case "test_pending":
          userMessage = "Waiting for Cloudflare to verify your CNAME record...";
          actionableMessage = `Make sure CNAME ${domainRecord.domain} points to ${process.env.CLOUDFLARE_CNAME_TARGET || "links.pivoturl.com"}`;
          break;
        case "moved":
          userMessage = "DNS no longer points to our service. Please check your CNAME record.";
          actionableMessage = `Update CNAME to point to ${process.env.CLOUDFLARE_CNAME_TARGET || "links.pivoturl.com"}`;
          break;
        case "blocked":
        case "test_blocked":
          userMessage = "This domain was blocked by Cloudflare.";
          break;
        case "pending_deletion":
        case "deleted":
          userMessage = "This domain is being deleted or has been deleted.";
          break;
        case "test_failed":
          userMessage = "Domain verification test failed.";
          break;
        default:
          userMessage = `Hostname status: ${cfHostnameStatus || "pending"}`;
      }

    } else if (!cfSslActive && cfConfigured) {
      switch (cfSslStatus) {
        case "initializing":
        case "pending_validation":
          userMessage = "SSL certificate validation in progress. This usually takes a few minutes...";
          if (sslValidationErrors && sslValidationErrors.length > 0) {
            userMessage += ` Error: ${sslValidationErrors[0]?.message || "Validation failed"}`;
          }
          actionableMessage = "Ensure your CNAME record is correctly pointed. HTTP validation requires this.";
          break;
        case "pending_issuance":
        case "pending_deployment":
          userMessage = "SSL certificate is being issued. This typically takes 2-5 minutes.";
          actionableMessage = "Click refresh again in a minute to check status.";
          break;
        case "validation_timed_out":
        case "initializing_timed_out":
          userMessage = "SSL validation timed out. Please try revalidating.";
          actionableMessage = "Ensure CNAME is pointed correctly, then click refresh to re-validate.";
          break;
         case "deactivating":
        case "inactive":
          userMessage = "SSL certificate is inactive.";
          break;
        case "expired":
        case "pending_expiration":
          userMessage = "SSL certificate is expired or expiring soon.";
          break;
        default:
          userMessage = `SSL status: ${cfSslStatus || "pending"}`;
      }

    } else if (!cfConfigured) {
      userMessage = "Cloudflare integration not configured. Domain ownership is verified.";
      if (txtVerified && !domainRecord.verified) {
        await db.update(domains).set({
          verified: true,
          updatedAt: new Date(),
        }).where(eq(domains.id, id));
      }
    }

    const revalidateStates = [
      "validation_timed_out",
      "initializing_timed_out",
      "pending_validation",
      "pending",
    ];

    const canRevalidate = cfConfigured && !!domainRecord.cfHostnameId && (
      revalidateStates.includes(cfHostnameStatus ?? "") ||
      revalidateStates.includes(cfSslStatus ?? "")
    );

    let severity: "success" | "warning" | "error" = "success";
    if (!fullyVerified) {
      if (cfError) {
        severity = "error";
      } else {
        severity = "warning";
      }
    }

    return NextResponse.json({
      verified: fullyVerified,
      severity,
      message: userMessage,
      actionable: actionableMessage,
      canRevalidate,
      cfError,
      verificationErrors,
      sslValidationErrors,
      status: {
        ownershipVerified: txtVerified,
        cfHostnameStatus,
        cfSslStatus,
        cfConfigured,
      }
    });

  } catch (err) {
    console.error("[POST /api/domains/:id/verify]", err);
    return NextResponse.json({ error: "Verification process failed" }, { status: 500 });
  }
}
