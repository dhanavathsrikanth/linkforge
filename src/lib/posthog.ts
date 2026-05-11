import { PostHog } from "posthog-node";

// ─── Server-side PostHog ──────────────────────────────────────────────────────
let _posthog: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!_posthog) {
    _posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _posthog;
}

/**
 * Track a server-side event via PostHog.
 * Non-blocking — errors are swallowed to never break request flow.
 */
export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    const ph = getPostHogServer();
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch (err) {
    console.warn("[posthog] trackServerEvent failed", err);
  }
}
