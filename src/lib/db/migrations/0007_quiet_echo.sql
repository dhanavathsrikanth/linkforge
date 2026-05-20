CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "actor_id" uuid REFERENCES users(id) ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON audit_logs(workspace_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);
