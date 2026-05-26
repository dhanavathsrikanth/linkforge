import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { links } from "@/lib/db";
import { inArray, eq } from "drizzle-orm";
import { getOrCreateDbUser } from "@/lib/auth";
import { resolveUserWorkspace, canWrite } from "@/lib/db/workspace";
import { logAudit } from "@/lib/db/audit";
import { sendWebhookEvent } from "@/lib/svix/send";
import { z } from "zod";

const BulkOperationSchema = z.object({
  workspaceId: z.string().uuid("Must provide a workspace ID"),
  ids: z.array(z.string().uuid()).min(1).max(500, "Maximum 500 links per operation"),
  action: z.enum(["delete", "toggleActive", "moveFolder", "addTags", "removeTags"]),
  isActive: z.boolean().optional(),
  folderId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const body = await req.json();
    const parsed = BulkOperationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const v = parsed.data;

    let ws;
    try {
      ws = await resolveUserWorkspace(dbUser.id, v.workspaceId);
      if (!canWrite(ws.role)) {
        return NextResponse.json({ error: "You don't have permission to modify links in this workspace" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Workspace not found or access denied" }, { status: 404 });
    }

    const existingLinks = await db.query.links.findMany({
      where: (l, { and, inArray: ia }) => and(ia(l.id, v.ids), eq(l.workspaceId, v.workspaceId)),
      columns: { id: true, slug: true, destination: true, tags: true },
    });

    if (existingLinks.length === 0) {
      return NextResponse.json({ error: "No matching links found" }, { status: 404 });
    }

    const ids = existingLinks.map((l) => l.id);

    switch (v.action) {
      case "delete": {
        await db.delete(links).where(inArray(links.id, ids));
        for (const link of existingLinks) {
          logAudit({
            workspaceId: v.workspaceId,
            actorId: dbUser.id,
            action: "delete",
            entityType: "link",
            entityId: link.id,
            metadata: { slug: link.slug, destination: link.destination, bulk: true },
          });
          sendWebhookEvent({
            eventType: "link.deleted",
            workspaceId: v.workspaceId,
            data: { linkId: link.id, slug: link.slug, destination: link.destination },
            actorId: dbUser.id,
            idempotencyKey: `link.deleted-${link.id}-${Date.now()}`,
          });
        }
        break;
      }

      case "toggleActive": {
        const newStatus = v.isActive ?? false;
        await db.update(links).set({ isActive: newStatus, updatedAt: new Date() }).where(inArray(links.id, ids));
        logAudit({
          workspaceId: v.workspaceId,
          actorId: dbUser.id,
          action: "update",
          entityType: "link",
          entityId: ids.join(","),
          metadata: { count: ids.length, isActive: newStatus, bulk: true },
        });
        break;
      }

      case "moveFolder": {
        const folderId = v.folderId ?? null;
        await db.update(links).set({ folderId, updatedAt: new Date() }).where(inArray(links.id, ids));
        logAudit({
          workspaceId: v.workspaceId,
          actorId: dbUser.id,
          action: "update",
          entityType: "link",
          entityId: ids.join(","),
          metadata: { count: ids.length, folderId, bulk: true },
        });
        break;
      }

      case "addTags": {
        const newTags = v.tags ?? [];
        for (const link of existingLinks) {
          const merged = [...new Set([...(link.tags ?? []), ...newTags])];
          await db.update(links).set({ tags: merged, updatedAt: new Date() }).where(eq(links.id, link.id));
        }
        break;
      }

      case "removeTags": {
        const removeTags = new Set(v.tags ?? []);
        for (const link of existingLinks) {
          const filtered = (link.tags ?? []).filter((t) => !removeTags.has(t));
          await db.update(links).set({ tags: filtered, updatedAt: new Date() }).where(eq(links.id, link.id));
        }
        break;
      }
    }

    return NextResponse.json({ ok: true, count: ids.length, action: v.action });
  } catch (err) {
    console.error("[POST /api/links/bulk-operations]", err);
    return NextResponse.json({ error: "Failed to run bulk operation" }, { status: 500 });
  }
}
