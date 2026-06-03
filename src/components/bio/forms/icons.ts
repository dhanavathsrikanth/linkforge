// ─── Brand icon catalog ───────────────────────────────────────────────────────
// Icons served from Simple Icons CDN (https://simpleicons.org).
// Format: https://cdn.simpleicons.org/{slug}/{hex-color}
// Grayscale variant: https://cdn.simpleicons.org/{slug}/9B9B9B
//
// Each entry has:
//   label    — display name
//   slug     — Simple Icons slug (lowercase, no spaces)
//   color    — brand hex color (no #)
//   category — for filtering in the gallery

export interface BrandIcon {
  label: string;
  slug: string;
  /** Brand hex color without # */
  color: string;
  category: Category;
}

export type Category =
  | "social"
  | "dev"
  | "design"
  | "music"
  | "video"
  | "business"
  | "messaging"
  | "other";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "social",    label: "Social" },
  { id: "dev",       label: "Dev" },
  { id: "design",    label: "Design" },
  { id: "music",     label: "Music" },
  { id: "video",     label: "Video" },
  { id: "business",  label: "Business" },
  { id: "messaging", label: "Messaging" },
  { id: "other",     label: "Other" },
];

export const BRAND_ICONS: BrandIcon[] = [
  // ── Social ──────────────────────────────────────────────────────────────────
  { label: "X / Twitter",   slug: "x",           color: "000000", category: "social" },
  { label: "Instagram",     slug: "instagram",   color: "E4405F", category: "social" },
  { label: "Facebook",      slug: "facebook",    color: "1877F2", category: "social" },
  { label: "LinkedIn",      slug: "linkedin",    color: "0A66C2", category: "social" },
  { label: "TikTok",        slug: "tiktok",      color: "000000", category: "social" },
  { label: "Snapchat",      slug: "snapchat",    color: "FFFC00", category: "social" },
  { label: "Pinterest",     slug: "pinterest",   color: "BD081C", category: "social" },
  { label: "Reddit",        slug: "reddit",      color: "FF4500", category: "social" },
  { label: "Threads",       slug: "threads",     color: "000000", category: "social" },
  { label: "Mastodon",      slug: "mastodon",    color: "6364FF", category: "social" },
  { label: "Bluesky",       slug: "bluesky",     color: "0085FF", category: "social" },
  { label: "Tumblr",        slug: "tumblr",      color: "35465C", category: "social" },
  { label: "Flickr",        slug: "flickr",      color: "0063DC", category: "social" },
  { label: "Twitch",        slug: "twitch",      color: "9146FF", category: "social" },
  { label: "Polywork",      slug: "polywork",    color: "543DE0", category: "social" },
  { label: "Clubhouse",     slug: "clubhouse",   color: "F3E8D2", category: "social" },

  // ── Dev ─────────────────────────────────────────────────────────────────────
  { label: "GitHub",        slug: "github",          color: "181717", category: "dev" },
  { label: "GitLab",        slug: "gitlab",          color: "FC6D26", category: "dev" },
  { label: "Bitbucket",     slug: "bitbucket",       color: "0052CC", category: "dev" },
  { label: "Stack Overflow",slug: "stackoverflow",   color: "F58025", category: "dev" },
  { label: "Dev.to",        slug: "devdotto",        color: "0A0A0A", category: "dev" },
  { label: "Hashnode",      slug: "hashnode",        color: "2962FF", category: "dev" },
  { label: "CodePen",       slug: "codepen",         color: "000000", category: "dev" },
  { label: "Replit",        slug: "replit",          color: "F26207", category: "dev" },
  { label: "Vercel",        slug: "vercel",          color: "000000", category: "dev" },
  { label: "Netlify",       slug: "netlify",         color: "00C7B7", category: "dev" },
  { label: "Cloudflare",    slug: "cloudflare",      color: "F38020", category: "dev" },
  { label: "Docker",        slug: "docker",          color: "2496ED", category: "dev" },
  { label: "Kubernetes",    slug: "kubernetes",      color: "326CE5", category: "dev" },
  { label: "npm",           slug: "npm",             color: "CB3837", category: "dev" },
  { label: "Product Hunt",  slug: "producthunt",     color: "DA552F", category: "dev" },
  { label: "Hacker News",   slug: "ycombinator",     color: "FF6600", category: "dev" },

  // ── Design ──────────────────────────────────────────────────────────────────
  { label: "Figma",         slug: "figma",       color: "F24E1E", category: "design" },
  { label: "Dribbble",      slug: "dribbble",    color: "EA4C89", category: "design" },
  { label: "Behance",       slug: "behance",     color: "1769FF", category: "design" },
  { label: "Sketch",        slug: "sketch",      color: "F7B500", category: "design" },
  { label: "Adobe",         slug: "adobe",       color: "FF0000", category: "design" },
  { label: "Framer",        slug: "framer",      color: "0055FF", category: "design" },
  { label: "Webflow",       slug: "webflow",     color: "4353FF", category: "design" },
  { label: "Canva",         slug: "canva",       color: "00C4CC", category: "design" },
  { label: "Unsplash",      slug: "unsplash",    color: "000000", category: "design" },
  { label: "Pexels",        slug: "pexels",      color: "05A081", category: "design" },

  // ── Music ───────────────────────────────────────────────────────────────────
  { label: "Spotify",       slug: "spotify",     color: "1DB954", category: "music" },
  { label: "Apple Music",   slug: "applemusic",  color: "FC3C44", category: "music" },
  { label: "SoundCloud",    slug: "soundcloud",  color: "FF3300", category: "music" },
  { label: "Bandcamp",      slug: "bandcamp",    color: "1DA0C3", category: "music" },
  { label: "Last.fm",       slug: "lastdotfm",   color: "D51007", category: "music" },
  { label: "Tidal",         slug: "tidal",       color: "000000", category: "music" },
  { label: "Deezer",        slug: "deezer",      color: "FEAA2D", category: "music" },
  { label: "Amazon Music",  slug: "amazonmusic", color: "25D1DA", category: "music" },

  // ── Video ───────────────────────────────────────────────────────────────────
  { label: "YouTube",       slug: "youtube",     color: "FF0000", category: "video" },
  { label: "Vimeo",         slug: "vimeo",       color: "1AB7EA", category: "video" },
  { label: "Twitch",        slug: "twitch",      color: "9146FF", category: "video" },
  { label: "Dailymotion",   slug: "dailymotion", color: "0066DC", category: "video" },
  { label: "Rumble",        slug: "rumble",      color: "85C742", category: "video" },

  // ── Business ────────────────────────────────────────────────────────────────
  { label: "Substack",      slug: "substack",    color: "FF6719", category: "business" },
  { label: "Medium",        slug: "medium",      color: "000000", category: "business" },
  { label: "Ghost",         slug: "ghost",       color: "15171A", category: "business" },
  { label: "Patreon",       slug: "patreon",     color: "FF424D", category: "business" },
  { label: "Ko-fi",         slug: "kofi",        color: "FF5E5B", category: "business" },
  { label: "Buy Me a Coffee",slug: "buymeacoffee",color: "FFDD00", category: "business" },
  { label: "Gumroad",       slug: "gumroad",     color: "36A9AE", category: "business" },
  { label: "Shopify",       slug: "shopify",     color: "96BF48", category: "business" },
  { label: "Etsy",          slug: "etsy",        color: "F16521", category: "business" },
  { label: "Amazon",        slug: "amazon",      color: "FF9900", category: "business" },
  { label: "Stripe",        slug: "stripe",      color: "635BFF", category: "business" },
  { label: "PayPal",        slug: "paypal",      color: "003087", category: "business" },
  { label: "Notion",        slug: "notion",      color: "000000", category: "business" },
  { label: "Linktree",      slug: "linktree",    color: "43E55E", category: "business" },

  // ── Messaging ───────────────────────────────────────────────────────────────
  { label: "WhatsApp",      slug: "whatsapp",    color: "25D366", category: "messaging" },
  { label: "Telegram",      slug: "telegram",    color: "26A5E4", category: "messaging" },
  { label: "Discord",       slug: "discord",     color: "5865F2", category: "messaging" },
  { label: "Slack",         slug: "slack",       color: "4A154B", category: "messaging" },
  { label: "Signal",        slug: "signal",      color: "3A76F0", category: "messaging" },
  { label: "Line",          slug: "line",        color: "00C300", category: "messaging" },
  { label: "WeChat",        slug: "wechat",      color: "07C160", category: "messaging" },
  { label: "Viber",         slug: "viber",       color: "7360F2", category: "messaging" },

  // ── Other ───────────────────────────────────────────────────────────────────
  { label: "Linktree",      slug: "linktree",    color: "43E55E", category: "other" },
  { label: "Calendly",      slug: "calendly",    color: "006BFF", category: "other" },
  { label: "Typeform",      slug: "typeform",    color: "262627", category: "other" },
  { label: "Google",        slug: "google",      color: "4285F4", category: "other" },
  { label: "Apple",         slug: "apple",       color: "000000", category: "other" },
  { label: "Microsoft",     slug: "microsoft",   color: "5E5E5E", category: "other" },
  { label: "OpenAI",        slug: "openai",      color: "412991", category: "other" },
  { label: "Wikipedia",     slug: "wikipedia",   color: "000000", category: "other" },
  { label: "WordPress",     slug: "wordpress",   color: "21759B", category: "other" },
  { label: "Squarespace",   slug: "squarespace", color: "000000", category: "other" },
];

// ─── Inline SVG fallbacks ─────────────────────────────────────────────────────
// Some brand glyphs render poorly via the simpleicons CDN (intermittent
// availability, ad-blocker false positives, edge cases in fill rules).
// We ship those inline as data URLs so they always work regardless of
// network conditions.
//
// The placeholder `__FILL__` is substituted with a hex colour (without
// the #) at runtime — `iconUrl` injects the brand colour, `iconUrlGray`
// injects 9B9B9B for the desaturated mode.

const INLINE_BRAND_SVG: Record<string, string> = {
  linkedin:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#__FILL__" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
};

function svgToDataUrl(svg: string): string {
  // `encodeURIComponent` keeps the SVG human-readable in DevTools while
  // making it safe inside a `src` attribute. No base64 needed.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function inlineIconUrl(slug: string, color: string): string | null {
  const tpl = INLINE_BRAND_SVG[slug];
  if (!tpl) return null;
  return svgToDataUrl(tpl.replaceAll("__FILL__", color));
}

// ─── URL builders ─────────────────────────────────────────────────────────────

/** Full-color icon URL */
export function iconUrl(icon: BrandIcon): string {
  return (
    inlineIconUrl(icon.slug, icon.color) ??
    customIconUrl(icon.slug, icon.color) ??
    `https://cdn.simpleicons.org/${icon.slug}/${icon.color}`
  );
}

/** Grayscale icon URL */
export function iconUrlGray(icon: BrandIcon): string {
  return (
    inlineIconUrl(icon.slug, "9B9B9B") ??
    customIconUrl(icon.slug, "9B9B9B") ??
    `https://cdn.simpleicons.org/${icon.slug}/9B9B9B`
  );
}

/** Override for icons removed from the SimpleIcons CDN */
function customIconUrl(slug: string, _color: string): string | null {
  if (slug === "linkedin") return "/icons/linkedin.svg";
  return null;
}

/** Build icon URL from a slug + optional color override */
export function buildIconUrl(slug: string, color = "9B9B9B"): string {
  return inlineIconUrl(slug, color) ?? customIconUrl(slug, color) ?? `https://cdn.simpleicons.org/${slug}/${color}`;
}

/** Check if a URL is a Simple Icons CDN URL */
export function isSimpleIconUrl(url: string): boolean {
  return (
    url.startsWith("https://cdn.simpleicons.org/") ||
    url.startsWith("data:image/svg+xml")
  );
}
