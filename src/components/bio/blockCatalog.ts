// ─── Block catalog ────────────────────────────────────────────────────────────
// Single source of truth for all block types in the bio editor.
//
// `icon` can be:
//   - A path to a local SVG (`/block-icons/*.svg`) — kept as a fallback
//     for blocks that have no obvious brand mark.
//   - A `simpleicons.org` CDN URL — used for brand blocks (YouTube,
//     Spotify, Instagram, etc.) so the icon is rendered in the actual
//     brand colour rather than a flat grey placeholder.
//
// `lucide` (optional) lets the renderer pick a Lucide icon instead.
// When present, the renderer prefers Lucide (rendered with the user's
// theme colour) over the local SVG to keep layout-style blocks in step
// with the rest of the editor UI.

export type LucideIconName =
  | "User"
  | "Link2"
  | "Layers"
  | "Type"
  | "Image"
  | "Box"
  | "MapPin"
  | "Heart"
  | "Mail";

export interface BlockCatalogEntry {
  type: string;
  title: string;
  label: string;
  /** Local SVG path (legacy) or remote CDN URL (preferred for brand blocks) */
  icon: string;
  /** Optional Lucide icon name — used by sidebar lists for layout-style blocks */
  lucide?: LucideIconName;
  /** Hex colour applied to the Lucide icon when rendered (layout blocks).
   *  Brand blocks ignore this — their colour is baked into the SVG. */
  color?: string;
  drag: { w: number; h: number };
}

// Simple-icons CDN — official brand-coloured SVGs.
//   https://cdn.simpleicons.org/<slug>/<hex>
// Brand hex values pulled from each company's brand guide.
const SI = (slug: string, hex: string) => `https://cdn.simpleicons.org/${slug}/${hex}`;

export const BIO_BLOCK_CATALOG: BlockCatalogEntry[] = [
  // ── Layout-style blocks: Lucide icons in vibrant accent colours ─────────
  {
    type: "header",
    title: "Header",
    label: "Profile avatar, name and bio",
    icon: "/block-icons/type-header.svg",
    lucide: "User",
    color: "#6366F1", // indigo-500
    drag: { w: 12, h: 6 },
  },
  {
    type: "link-box",
    title: "Link Box",
    label: "A nicely formatted link card",
    icon: "/block-icons/type-link-box.svg",
    lucide: "Link2",
    color: "#3B82F6", // blue-500
    drag: { w: 12, h: 2 },
  },
  {
    type: "link-bar",
    title: "Social Links",
    label: "A row of social icon links",
    icon: "/block-icons/type-link-bar.svg",
    lucide: "Layers",
    color: "#8B5CF6", // violet-500
    drag: { w: 12, h: 2 },
  },
  {
    type: "links",
    title: "Links",
    label: "A list of links inside one card",
    icon: "/block-icons/type-link-box.svg",
    lucide: "Link2",
    color: "#0891B2", // cyan-600 — distinct from Link Box (blue) and Social Links (violet)
    drag: { w: 12, h: 6 },
  },
  {
    type: "content",
    title: "Content",
    label: "A block of rich text",
    icon: "/block-icons/type-content.svg",
    lucide: "Type",
    color: "#0EA5E9", // sky-500
    drag: { w: 12, h: 6 },
  },
  {
    type: "image",
    title: "Image",
    label: "An image with optional caption",
    icon: "/block-icons/type-image.svg",
    lucide: "Image",
    color: "#10B981", // emerald-500
    drag: { w: 8, h: 8 },
  },
  {
    type: "stack",
    title: "Stack",
    label: "A list of items with icons",
    icon: "/block-icons/type-stack.svg",
    lucide: "Box",
    color: "#F59E0B", // amber-500
    drag: { w: 6, h: 8 },
  },
  {
    type: "map",
    title: "Map",
    label: "A map with a location pin",
    icon: "/block-icons/type-map.svg",
    lucide: "MapPin",
    color: "#EF4444", // red-500
    drag: { w: 12, h: 6 },
  },
  {
    type: "reaction",
    title: "Reactions",
    label: "Emoji reactions for engagement",
    icon: "/block-icons/type-reactions.svg",
    lucide: "Heart",
    color: "#EC4899", // pink-500
    drag: { w: 4, h: 4 },
  },
  {
    type: "waitlist-email",
    title: "Waitlist",
    label: "Email capture form",
    icon: "/block-icons/type-waitlist-email.svg",
    lucide: "Mail",
    color: "#14B8A6", // teal-500
    drag: { w: 12, h: 5 },
  },

  // ── Brand blocks: Simple Icons CDN (real brand colours) ──────────────────
  {
    type: "youtube",
    title: "YouTube",
    label: "Embed a YouTube video",
    icon: SI("youtube", "FF0000"),
    drag: { w: 12, h: 6 },
  },
  {
    type: "spotify-embed",
    title: "Spotify Embed",
    label: "Embed a playlist or track",
    icon: SI("spotify", "1DB954"),
    drag: { w: 12, h: 4 },
  },
  {
    type: "spotify-playing-now",
    title: "Spotify Playing",
    label: "Show what you're listening to",
    icon: SI("spotify", "1DB954"),
    drag: { w: 12, h: 4 },
  },
  {
    type: "github-commits-this-month",
    title: "GitHub Commits",
    label: "Monthly commit count",
    icon: SI("github", "181717"),
    drag: { w: 6, h: 6 },
  },
  {
    type: "instagram-latest-post",
    title: "Instagram Latest",
    label: "Your latest Instagram post",
    icon: SI("instagram", "E4405F"),
    drag: { w: 12, h: 4 },
  },
  {
    type: "instagram-follower-count",
    title: "Instagram Followers",
    label: "Your Instagram follower count",
    icon: SI("instagram", "E4405F"),
    drag: { w: 6, h: 6 },
  },
  {
    type: "threads-follower-count",
    title: "Threads Followers",
    label: "Your Threads follower count",
    icon: SI("threads", "000000"),
    drag: { w: 6, h: 6 },
  },
  {
    type: "tiktok-latest-post",
    title: "TikTok Latest",
    label: "Your latest TikTok video",
    icon: SI("tiktok", "000000"),
    drag: { w: 6, h: 6 },
  },
  {
    type: "tiktok-follower-count",
    title: "TikTok Followers",
    label: "Your TikTok follower count",
    icon: SI("tiktok", "000000"),
    drag: { w: 6, h: 6 },
  },
];
