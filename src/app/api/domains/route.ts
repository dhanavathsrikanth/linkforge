import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains, links } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

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

    return NextResponse.json({
      domain: newDomain.domain,
      verificationToken: newDomain.verificationToken,
      cnameTarget: "links.linkforge.app",
      txtRecord: `_linkforge-verify.${newDomain.domain}`,
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/domains]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
