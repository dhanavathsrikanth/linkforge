import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { domains, links, linkGallery } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canAdmin } from "@/lib/db/workspace";
import { cloudflareCustomHostnames } from "@/lib/cloudflare/custom-hostnames";
import { refreshDomainConfig, syncDomainConfig } from "@/lib/domains/config-sync";
import { getEffectiveLimits } from "@/lib/billing/usage";
import { featureGateError } from "@/lib/billing/middleware";

export async function DELETE(
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
      return NextResponse.json({ error: "Forbidden: Only workspace admins can delete domains" }, { status: 403 });
    }

    const allWorkspaceDomains = await db.query.domains.findMany({
      where: and(
        eq(domains.workspaceId, domainRecord.workspaceId),
        eq(domains.verified, true)
      )
    });

    if (domainRecord.verified && allWorkspaceDomains.length === 1) {
      return NextResponse.json({ error: "Cannot delete the only verified domain. Add another verified domain first." }, { status: 400 });
    }

    // ── Binding check + confirm gate (custom-domain-assignment Req 11.1) ──────
    const boundLinks = await db
      .select({ id: links.id })
      .from(links)
      .where(eq(links.domainId, id));
    const boundBio = await db.query.linkGallery.findFirst({
      where: eq(linkGallery.customDomainId, id),
      columns: { id: true, slug: true },
    });

    let confirm = false;
    try {
      const body = await req.json();
      confirm = body?.confirm === true;
    } catch { /* no body → not confirmed */ }

    if ((boundLinks.length > 0 || boundBio) && !confirm) {
      return NextResponse.json(
        {
          error: {
            code: "IN_USE",
            linkCount: boundLinks.length,
            bioCount: boundBio ? 1 : 0,
            bioBinding: boundBio ?? undefined,
          },
        },
        { status: 409 }
      );
    }

    // ── DB mutations (analytics preserved — clicks reference linkId, never
    //    domainId; we only null the FK references; Req 19) ─────────────────────
    await db.update(links).set({ domainId: null }).where(eq(links.domainId, id));
    if (boundBio) {
      await db
        .update(linkGallery)
        .set({ customDomainId: null, isRootPage: false })
        .where(eq(linkGallery.customDomainId, id));
    }

    // ── Edge + Cloudflare cleanup (post-DB; failures → 207, Req 11.3/11.4) ────
    const sideEffects: Record<string, boolean> = {};

    // 1. domain:{host} routing config
    sideEffects.domainConfig = await syncDomainConfig(domainRecord.domain, null);

    // 2. bio:domain:{host} mapping (if any bio was bound)
    if (boundBio) {
      sideEffects.bioMapping = await removeBioMapping(domainRecord.domain);
    }

    // 3. Cloudflare custom hostname
    if (domainRecord.cfHostnameId && cloudflareCustomHostnames.isConfigured()) {
      try {
        await cloudflareCustomHostnames.delete(domainRecord.cfHostnameId);
        sideEffects.cloudflare = true;
      } catch (cfErr) {
        console.warn(`[Cloudflare] Failed to delete hostname ${domainRecord.cfHostnameId}:`, cfErr);
        sideEffects.cloudflare = false;
      }
    }

    // 4. Delete the row (always — DB is the source of truth)
    await db.delete(domains).where(eq(domains.id, id));

    const allOk = Object.values(sideEffects).every(Boolean);
    if (!allOk) {
      return NextResponse.json(
        { success: true, partial: true, sideEffects },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/domains/:id]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Remove the worker's bio:domain:{host} mapping. Returns true on success. */
async function removeBioMapping(domain: string): Promise<boolean> {
  const workerUrl = process.env.CF_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl || !workerSecret) return true; // no worker (dev) → no-op success
  try {
    const res = await fetch(`${workerUrl}/internal/bio/domain-mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify({ domain, remove: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { id } = await params;

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
      return NextResponse.json({ error: "Forbidden: Only workspace admins can manage domains" }, { status: 403 });
    }

    // Parse the action (legacy callers send no body → treated as setDefault).
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* legacy: empty body */ }
    const action = (body.action as string) ?? "setDefault";

    // ── setRole (custom-domain-assignment Req 1, 24) ──────────────────────────
    if (action === "setRole") {
      const role = body.role as "links" | "bio" | "both";
      if (!["links", "bio", "both"].includes(role)) {
        return NextResponse.json({ error: { code: "INVALID_ROLE" } }, { status: 400 });
      }
      // role=both is a paid capability (Req 24).
      if (role === "both") {
        const limits = await getEffectiveLimits(domainRecord.workspaceId);
        if (!limits.mixedDomainRoleEnabled) {
          return featureGateError("mixedDomainRoleEnabled", ws.plan);
        }
      }
      // Reject lowering a role while conflicting bindings still exist.
      if (role === "links" || role === "bio") {
        const boundBio = await db.query.linkGallery.findFirst({
          where: eq(linkGallery.customDomainId, id),
          columns: { id: true, slug: true },
        });
        const boundLink = await db.query.links.findFirst({
          where: eq(links.domainId, id),
          columns: { id: true },
        });
        if (role === "links" && boundBio) {
          return NextResponse.json(
            { error: { code: "ROLE_HAS_BINDINGS", bio: boundBio } },
            { status: 409 }
          );
        }
        if (role === "bio" && boundLink) {
          return NextResponse.json(
            { error: { code: "ROLE_HAS_BINDINGS", linkId: boundLink.id } },
            { status: 409 }
          );
        }
      }
      const [updated] = await db
        .update(domains)
        .set({ role, updatedAt: new Date() })
        .where(eq(domains.id, id))
        .returning();
      await refreshDomainConfig(domainRecord.domain);
      return NextResponse.json(updated);
    }

    // ── suspend / unsuspend (custom-domain-assignment Req 17) ─────────────────
    if (action === "suspend" || action === "unsuspend") {
      const status =
        action === "unsuspend"
          ? "active"
          : (body.status as "suspended_billing" | "suspended_abuse") ?? "suspended_billing";
      const [updated] = await db
        .update(domains)
        .set({
          status,
          suspendedAt: action === "suspend" ? new Date() : null,
          suspendedReason: action === "suspend" ? ((body.reason as string) ?? null) : null,
          updatedAt: new Date(),
        })
        .where(eq(domains.id, id))
        .returning();
      await refreshDomainConfig(domainRecord.domain);
      return NextResponse.json(updated);
    }

    // ── setRootRedirect (custom-domain-assignment Req 10.5) ───────────────────
    if (action === "setRootRedirect") {
      const url = (body.rootRedirectUrl as string) || null;
      const [updated] = await db
        .update(domains)
        .set({ rootRedirectUrl: url, updatedAt: new Date() })
        .where(eq(domains.id, id))
        .returning();
      await refreshDomainConfig(domainRecord.domain);
      return NextResponse.json(updated);
    }

    // ── setDefault (default / legacy "set primary") ───────────────────────────
    if (!domainRecord.verified) {
      return NextResponse.json({ error: "Only verified domains can be set as primary" }, { status: 400 });
    }
    // Default-domain selection is a paid capability (Req 23).
    {
      const limits = await getEffectiveLimits(domainRecord.workspaceId);
      if (!limits.defaultDomainEnabled) {
        return featureGateError("defaultDomainEnabled", ws.plan);
      }
    }

    await db
      .update(domains)
      .set({ isDefault: false })
      .where(eq(domains.workspaceId, domainRecord.workspaceId));

    const [updated] = await db
      .update(domains)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(domains.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/domains/:id]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
