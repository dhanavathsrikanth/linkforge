import PostHog from "posthog-js";

export const posthog =
  typeof window !== "undefined"
    ? PostHog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
        autocapture: false, // We track custom events only
        capture_pageview: false, // We handle page views manually if needed
      })
    : null;

// Custom event tracking functions
export const trackLinkCreated = (params: {
  linkId: string;
  domain: string;
  hasCustomSlug: boolean;
  hasUTM: boolean;
}) => {
  posthog?.capture("link_created", params);
};

export const trackLinkClicked = (params: {
  linkId: string;
  domain: string;
}) => {
  posthog?.capture("link_clicked", params);
};

export const trackQRDownloaded = (params: {
  linkId: string;
  format: string;
}) => {
  posthog?.capture("qr_downloaded", params);
};

export const trackBioPageViewed = (params: {
  galleryId: string;
}) => {
  posthog?.capture("bio_page_viewed", params);
};

export const trackUserUpgraded = (params: {
  fromPlan: string;
  toPlan: string;
}) => {
  posthog?.capture("user_upgraded", params);
};