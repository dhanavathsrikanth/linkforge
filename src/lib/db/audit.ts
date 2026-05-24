import { db, auditLogs } from ".";

type AuditAction = "create" | "update" | "delete" | "ab_test_update" | "ab_test_stop" | "ab_test_declare_winner";
type EntityType = "link" | "domain" | "api_key" | "workspace_member";

export async function logAudit({
  workspaceId,
  actorId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  workspaceId: string;
  actorId?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    workspaceId,
    actorId: actorId ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: metadata ?? null,
  });
}
