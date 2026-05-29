// ─── Block Types ─────────────────────────────────────────────────────────────

export type BlockType =
  | "header"
  | "link-bar"
  | "link-box"
  | "content"
  | "image"
  | "reaction"
  | "youtube"
  | "spotify-embed"
  | "spotify-playing-now"
  | "tiktok-latest-post"
  | "tiktok-follower-count"
  | "instagram-latest-post"
  | "instagram-follower-count"
  | "threads-follower-count"
  | "github-commits-this-month"
  | "stack"
  | "map"
  | "waitlist-email"
  | "qr";

export const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: "header",                    label: "Header",              icon: "UserCircle",    description: "Profile header with avatar, title, and bio" },
  { type: "link-bar",                  label: "Social Links",        icon: "Share2",        description: "Social media icon links row" },
  { type: "link-box",                  label: "Link Box",            icon: "ExternalLink",  description: "Individual link buttons with icons" },
  { type: "content",                   label: "Content",             icon: "FileText",      description: "Rich text or HTML content" },
  { type: "image",                     label: "Image",               icon: "Image",         description: "Image block with optional caption" },
  { type: "reaction",                  label: "Reactions",           icon: "Heart",         description: "Emoji reactions for engagement" },
  { type: "youtube",                   label: "YouTube",             icon: "Play",          description: "YouTube video embed" },
  { type: "spotify-embed",             label: "Spotify Embed",       icon: "Music",         description: "Spotify playlist or track embed" },
  { type: "spotify-playing-now",       label: "Spotify Playing",     icon: "Headphones",    description: "Show what you're listening to" },
  { type: "tiktok-latest-post",        label: "TikTok Latest",       icon: "Video",         description: "Display your latest TikTok video" },
  { type: "tiktok-follower-count",     label: "TikTok Followers",    icon: "Users",         description: "Show your TikTok follower count" },
  { type: "instagram-latest-post",     label: "Instagram Latest",    icon: "Camera",        description: "Display your latest Instagram post" },
  { type: "instagram-follower-count",  label: "Instagram Followers", icon: "Users",         description: "Show your Instagram follower count" },
  { type: "threads-follower-count",    label: "Threads Followers",   icon: "MessageCircle", description: "Show your Threads follower count" },
  { type: "github-commits-this-month", label: "GitHub Commits",      icon: "GitCommit",     description: "Show your monthly GitHub commits" },
  { type: "stack",                     label: "Tech Stack",          icon: "Layers",        description: "Display your technology stack" },
  { type: "map",                       label: "Map",                 icon: "MapPin",        description: "Embed a map location" },
  { type: "waitlist-email",            label: "Waitlist",            icon: "Mail",          description: "Email capture for waitlists" },
  { type: "qr",                        label: "QR Code",             icon: "QrCode",        description: "QR code for your page or any URL" },
];

// ─── Block Theme ──────────────────────────────────────────────────────────────

export interface BlockTheme {
  bgBase?: string;
  bgPrimary?: string;
  labelColor?: string;
  borderColor?: string;
  accentColor?: string;
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

// ─── Block Configurations ─────────────────────────────────────────────────────

export interface BlockPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
}

export interface BlockConfig {
  id: string;
  type: BlockType;
  sortOrder: number;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  visible: boolean;
  integrationId?: string | null;
  position?: BlockPosition | null;
  theme?: BlockTheme | null;
}

// ─── Header Block Config ────────────────────────────────────────────────────

export interface HeaderBlockConfig {
  title: string;
  description: string;
  avatar: { src: string };
  showVerifiedBadge: boolean;
  verifiedPageTitle: string;
  alignment: "left" | "center" | "right";
}

export const headerBlockDefaults: HeaderBlockConfig = {
  avatar: { src: "" },
  title: "Hello World",
  description: "Welcome to your new page",
  showVerifiedBadge: false,
  verifiedPageTitle: "",
  alignment: "left",
};

// ─── Link Bar Block Config ──────────────────────────────────────────────────

export interface LinkBarBlockConfig {
  links: {
    link: string;
    icon: { src: string };
    label: string;
  }[];
}

export const linkBarBlockDefaults: LinkBarBlockConfig = {
  links: [
    { link: "https://x.com/", icon: { src: "/icons/twitter.svg" }, label: "Twitter" },
    { link: "https://instagram.com/", icon: { src: "/icons/instagram.svg" }, label: "Instagram" },
    { link: "https://github.com/", icon: { src: "/icons/github.svg" }, label: "GitHub" },
  ],
};

// ─── Link Box Block Config ──────────────────────────────────────────────────

export interface LinkBoxBlockConfig {
  title: string;
  label: string;
  icon: { src: string };
  link: string;
  showPreview: boolean;
}

export const linkBoxBlockDefaults: LinkBoxBlockConfig = {
  icon: { src: "" },
  link: "https://",
  title: "New Link",
  label: "Check this out",
  showPreview: false,
};

// ─── Content Block Config ───────────────────────────────────────────────────

export interface ContentBlockConfig {
  content: string;
  alignment: "left" | "center" | "right";
}

export const contentBlockDefaults: ContentBlockConfig = {
  content: "",
  alignment: "left",
};

// ─── Image Block Config ─────────────────────────────────────────────────────

export interface ImageBlockConfig {
  src: string;
  alt: string;
  caption: string;
  width: "full" | "auto";
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

export const imageBlockDefaults: ImageBlockConfig = {
  src: "",
  alt: "",
  caption: "",
  width: "full",
  borderRadius: "md",
};

// ─── Reaction Block Config ──────────────────────────────────────────────────

export interface ReactionBlockConfig {
  enabled: boolean;
  allowedReactions: string[];
}

export const reactionBlockDefaults: ReactionBlockConfig = {
  enabled: true,
  allowedReactions: ["❤️", "👍", "🔥", "🎉", "🚀"],
};

// ─── YouTube Block Config ───────────────────────────────────────────────────

export interface YouTubeBlockConfig {
  videoId: string;
  autoplay: boolean;
  showTitle: boolean;
}

export const youtubeBlockDefaults: YouTubeBlockConfig = {
  videoId: "",
  autoplay: false,
  showTitle: true,
};

// ─── Spotify Block Config ───────────────────────────────────────────────────

export interface SpotifyBlockConfig {
  embedUrl: string;
  type: "track" | "playlist" | "album";
}

export const spotifyBlockDefaults: SpotifyBlockConfig = {
  embedUrl: "",
  type: "track",
};

// ─── Waitlist Block Config ──────────────────────────────────────────────────

export interface WaitlistBlockConfig {
  title: string;
  description: string;
  buttonText: string;
  successMessage: string;
  emailPlaceholder: string;
}

export const waitlistBlockDefaults: WaitlistBlockConfig = {
  title: "Join the Waitlist",
  description: "Be the first to know when we launch.",
  buttonText: "Join Waitlist",
  successMessage: "Thanks! We'll be in touch.",
  emailPlaceholder: "Enter your email...",
};

// ─── Tech Stack Block Config ────────────────────────────────────────────────

export interface TechStackItem {
  name: string;
  icon: string;
  url: string;
}

export interface StackBlockConfig {
  title: string;
  items: TechStackItem[];
}

export const stackBlockDefaults: StackBlockConfig = {
  title: "Built With",
  items: [],
};

// ─── Map Block Config ───────────────────────────────────────────────────────

export interface MapBlockConfig {
  latitude: number;
  longitude: number;
  zoom: number;
  markerTitle: string;
  mapStyle: "default" | "satellite" | "terrain";
}

export const mapBlockDefaults: MapBlockConfig = {
  latitude: 0,
  longitude: 0,
  zoom: 12,
  markerTitle: "",
  mapStyle: "default",
};

// ─── QR Code Block Config ──────────────────────────────────────────────────

export interface QRBlockConfig {
  url: string;
  useGalleryUrl: boolean;
  fgColor: string;
  bgColor: string;
  errorLevel: "L" | "M" | "Q" | "H";
  size: number;
  margin: number;
  frameStyle: "none" | "scan-me";
  rounded: boolean;
}

export const qrBlockDefaults: QRBlockConfig = {
  url: "",
  useGalleryUrl: true,
  fgColor: "#000000",
  bgColor: "#ffffff",
  errorLevel: "M",
  size: 200,
  margin: 0,
  frameStyle: "none",
  rounded: false,
};

// ─── Existing Gallery Types ────────────────────────────────────────────────────

export interface GalleryLink {
  id: string;
  title: string;
  url: string;
  emoji?: string;
  visible: boolean;
}

export type ButtonStyle = "rounded" | "pill" | "square" | "shadow";
export type BgType = "solid" | "gradient" | "preset";
export type GalleryFont = "Inter" | "Poppins" | "Space Mono" | "Playfair Display";

export type PresetTheme =
  | "dark"
  | "light"
  | "ocean"
  | "sunset"
  | "forest"
  | "purple";

export interface GalleryAppearance {
  bgType: BgType;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientDir: number;
  preset?: PresetTheme;
  buttonStyle: ButtonStyle;
  buttonColor: string;
  buttonTextColor: string;
  font: GalleryFont;
  backgroundImage?: string | null;
}

export interface GalleryPage {
  id: string;
  workspaceId: string;
  userId: string;
  customDomainId: string | null;
  slug: string;
  isPublished: boolean;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarInitials: string | null;
  avatarBgColor: string;
  links: GalleryLink[];
  blocks?: BlockConfig[];
  appearance: GalleryAppearance | null;
  themeId?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  showBranding: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Published snapshot ───────────────────────────────────────────────────────
// Frozen copy of the bio page that the public /p/[slug] route serves.
// Created/replaced when the user clicks "Publish" or "Update content".
// Autosave on /edit only writes to the live columns + blocks tables (the
// "draft"); it never touches this column.

export interface PublishedSnapshotBlock {
  id: string;
  type: string;
  sortOrder: number;
  config: Record<string, unknown>;
  data: Record<string, unknown>;
  visible: boolean;
}

export interface PublishedSnapshot {
  // Profile
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarInitials: string | null;
  avatarBgColor: string;
  // Theme & branding
  themeId: string | null;
  showBranding: boolean;
  // SEO
  seoTitle: string | null;
  seoDescription: string | null;
  // Content
  blocks: PublishedSnapshotBlock[];
  // Bookkeeping
  snapshotVersion: 1;
}

// ─── Preset theme configs ──────────────────────────────────────────────────────

export const PRESET_THEMES: Record<PresetTheme, GalleryAppearance> = {
  dark: {
    bgType: "solid",
    bgColor: "#0f0f13",
    gradientFrom: "#0f0f13",
    gradientTo: "#1e1b4b",
    gradientDir: 135,
    preset: "dark",
    buttonStyle: "rounded",
    buttonColor: "#1e1e2e",
    buttonTextColor: "#ffffff",
    font: "Inter",
  },
  light: {
    bgType: "solid",
    bgColor: "#fafafa",
    gradientFrom: "#fafafa",
    gradientTo: "#f0f0f0",
    gradientDir: 180,
    preset: "light",
    buttonStyle: "rounded",
    buttonColor: "#ffffff",
    buttonTextColor: "#111111",
    font: "Inter",
  },
  ocean: {
    bgType: "gradient",
    bgColor: "#0c4a6e",
    gradientFrom: "#0c4a6e",
    gradientTo: "#0891b2",
    gradientDir: 160,
    preset: "ocean",
    buttonStyle: "pill",
    buttonColor: "rgba(255,255,255,0.15)",
    buttonTextColor: "#ffffff",
    font: "Poppins",
  },
  sunset: {
    bgType: "gradient",
    bgColor: "#7c2d12",
    gradientFrom: "#f97316",
    gradientTo: "#9333ea",
    gradientDir: 135,
    preset: "sunset",
    buttonStyle: "pill",
    buttonColor: "rgba(255,255,255,0.2)",
    buttonTextColor: "#ffffff",
    font: "Poppins",
  },
  forest: {
    bgType: "gradient",
    bgColor: "#14532d",
    gradientFrom: "#14532d",
    gradientTo: "#166534",
    gradientDir: 180,
    preset: "forest",
    buttonStyle: "rounded",
    buttonColor: "rgba(255,255,255,0.12)",
    buttonTextColor: "#ffffff",
    font: "Inter",
  },
  purple: {
    bgType: "gradient",
    bgColor: "#3b0764",
    gradientFrom: "#3b0764",
    gradientTo: "#6366f1",
    gradientDir: 135,
    preset: "purple",
    buttonStyle: "pill",
    buttonColor: "rgba(255,255,255,0.15)",
    buttonTextColor: "#ffffff",
    font: "Poppins",
  },
};

export const DEFAULT_APPEARANCE: GalleryAppearance = {
  bgType: "solid",
  bgColor: "#0f0f13",
  gradientFrom: "#0f0f13",
  gradientTo: "#6366f1",
  gradientDir: 135,
  buttonStyle: "rounded",
  buttonColor: "#1e1e2e",
  buttonTextColor: "#ffffff",
  font: "Inter",
};

export function getBlockDefaults(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "header": return { ...headerBlockDefaults };
    case "link-bar": return { ...linkBarBlockDefaults };
    case "link-box": return { ...linkBoxBlockDefaults };
    case "content": return { ...contentBlockDefaults };
    case "image": return { ...imageBlockDefaults };
    case "reaction": return { ...reactionBlockDefaults };
    case "youtube": return { ...youtubeBlockDefaults };
    case "spotify-embed":
    case "spotify-playing-now": return { ...spotifyBlockDefaults };
    case "waitlist-email": return { ...waitlistBlockDefaults };
    case "stack": return { ...stackBlockDefaults };
    case "map": return { ...mapBlockDefaults };
    case "qr": return { ...qrBlockDefaults };
    default: return {};
  }
}