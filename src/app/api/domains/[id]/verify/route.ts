import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
  }

  try {
    // 1. Fetch domain record
    const domainRecord = await db.query.domains.findFirst({
      where: eq(domains.id, id),
      with: {
        workspace: true
      }
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // 2. Verify ownership (only owner of the workspace can verify)
    if (domainRecord.workspace.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!domainRecord.verificationToken) {
      return NextResponse.json({ error: "No verification token found" }, { status: 400 });
    }

    // 3. Perform DNS TXT lookup using Cloudflare DNS over HTTPS
    const txtRecordName = `_linkforge-verify.${domainRecord.domain}`;
    
    // Cloudflare DoH expects Accept: application/dns-json
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtRecordName)}&type=TXT`;
    
    const dnsRes = await fetch(dnsUrl, {
      headers: {
        "Accept": "application/dns-json"
      }
    });

    if (!dnsRes.ok) {
      throw new Error(`DNS query failed: ${dnsRes.statusText}`);
    }

    const dnsData = await dnsRes.json();
    let isVerified = false;

    if (dnsData.Status === 0 && dnsData.Answer) {
      // dnsData.Answer is an array of records
      for (const record of dnsData.Answer) {
        // TXT records are often wrapped in quotes
        const data = record.data.replace(/^"|"$/g, '');
        if (data === domainRecord.verificationToken) {
          isVerified = true;
          break;
        }
      }
    }

    if (isVerified) {
      // 4. Update status in DB
      await db
        .update(domains)
        .set({
          verified: true,
          updatedAt: new Date(),
        })
        .where(eq(domains.id, id));

      return NextResponse.json({ 
        verified: true, 
        message: "Domain verified successfully!"
      });
    }

    return NextResponse.json({ 
      verified: false, 
      message: "TXT record not found yet. DNS can take up to 48 hours to propagate."
    });

  } catch (err) {
    console.error("[POST /api/domains/:id/verify]", err);
    return NextResponse.json({ error: "Verification process failed" }, { status: 500 });
  }
}
