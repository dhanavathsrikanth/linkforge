import { Webhook as SvixWebhook } from "svix";

export function verifyWebhookSignature(
  payload: string,
  headers: Record<string, string>,
  secret: string
) {
  const wh = new SvixWebhook(secret);
  return wh.verify(payload, headers);
}
