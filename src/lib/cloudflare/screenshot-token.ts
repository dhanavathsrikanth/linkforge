import crypto from "node:crypto";

/**
 * Short-lived signed tokens for serving screenshots (Req 6.3, 24.3).
 *
 * A token is a base64url-encoded JSON payload of { scanId, exp } and a
 * HMAC-SHA256 signature appended after a `.` separator. TTL is fixed at
 * 10 minutes — the middle of the [5m, 15m] bound the spec requires.
 *
 * Stateless. The HMAC key is derived from `INTERNAL_SECRET` (already used
 * for cron auth) so we don't introduce a new secret to leak.
 */

const TTL_SECONDS = 10 * 60;

function hmacKey(): Buffer {
  const k =
    process.env.SCREENSHOT_TOKEN_SECRET ||
    process.env.INTERNAL_SECRET ||
    process.env.WORKER_SECRET ||
    "linkforge-screenshot-fallback";
  return Buffer.from(k, "utf8");
}

function base64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer {
  const pad = s.length % 4;
  const padded = pad ? s + "=".repeat(4 - pad) : s;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function createScreenshotToken(scanId: string): string {
  const payload = JSON.stringify({
    scanId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  });
  const payloadB64 = base64urlEncode(payload);
  const sig = crypto
    .createHmac("sha256", hmacKey())
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${base64urlEncode(sig)}`;
}

export interface VerifiedToken {
  scanId: string;
  exp: number;
}

export function verifyScreenshotToken(token: string): VerifiedToken | null {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const expected = crypto
    .createHmac("sha256", hmacKey())
    .update(payloadB64)
    .digest();
  let provided: Buffer;
  try {
    provided = base64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  let parsed: { scanId?: string; exp?: number };
  try {
    parsed = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed.scanId || !parsed.exp) return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

  return { scanId: parsed.scanId, exp: parsed.exp };
}
