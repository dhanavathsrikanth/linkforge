import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyDomainDNS } from "@/lib/dns/verify";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { domainId } = await req.json();

    if (!domainId) {
      return NextResponse.json({ error: "Domain ID is required" }, { status: 400 });
    }

    // 1. Fetch domain record
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, domainId),
      with: {
        workspace: true
      }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // 2. Verify ownership (only owner of the workspace can verify)
    // Assuming workspace ownerId is linked to clerkId
    if (domainRecord.workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!domainRecord.verificationToken) {
      return NextResponse.json({ error: "No verification token found" }, { status: 400 });
    }

    // 3. Perform DNS check
    const result = await verifyDomainDNS(domainRecord.domain, domainRecord.verificationToken);

    if (result.verified) {
      // 4. Update status in DB
      await db
        .update(domains)
        .set({
          verified: true,
          updatedAt: new Date(),
        })
        .where(eq(domains.id, domainId));

      return NextResponse.json({ 
        success: true, 
        message: "Domain verified successfully!",
        details: result
      });
    }

    return NextResponse.json({ 
      success: false, 
      message: "DNS records not found yet. It may take some time to propagate.",
      details: result
    });

  } catch (err) {
    console.error("[POST /api/domains/verify]", err);
    return NextResponse.json({ error: "Verification process failed" }, { status: 500 });
  }
}
