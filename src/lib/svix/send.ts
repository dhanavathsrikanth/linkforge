import { svix } from "./client";
import type { PivotUrlEventType } from "./event-types";

export type WebhookPayload<T = Record<string, unknown>> = {
  eventType: PivotUrlEventType;
  workspaceId: string;
  data: T;
  actorId?: string;
  timestamp?: string;
  /** Deterministic idempotency key — same key + same payload = no duplicate delivery.
   *  Shape: `<event-name>-<entity-id>-<timestamp-or-seq>` */
  idempotencyKey?: string;
};

export async function sendWebhookEvent<T extends Record<string, unknown>>(
  payload: WebhookPayload<T>
) {
  const { eventType, workspaceId, data, actorId, idempotencyKey } = payload;

  try {
    await svix.message.create(
      workspaceId,
      {
        eventType,
        payload: {
          eventType,
          workspaceId,
          data,
          actorId,
          timestamp: new Date().toISOString(),
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );
  } catch (err) {
    console.error(`[svix] Failed to send ${eventType} for workspace ${workspaceId}:`, err);
  }
}
