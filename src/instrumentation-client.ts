// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://79b2132e6c1d1e67c418d2ca1d1d1235@o4511485507993600.ingest.us.sentry.io/4511485527719936",

  // Define how likely traces are sampled. Sampling at 10% keeps the free-tier
  // trace quota healthy on high-traffic routes (e.g. /[slug] redirects).
  // Raise this temporarily when actively debugging a performance issue.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
