// ─── Gallery Types ─────────────────────────────────────────────────────────────

export interface GalleryLink {
  id: string;          // nanoid, client-generated
  title: string;
  url: string;
  emoji?: string;      // optional emoji icon
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
  bgColor: string;             // hex — used for solid
  gradientFrom: string;        // hex
  gradientTo: string;          // hex
  gradientDir: number;         // degrees (0-360)
  preset?: PresetTheme;
  buttonStyle: ButtonStyle;
  buttonColor: string;         // hex
  buttonTextColor: string;     // hex
  font: GalleryFont;
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
  appearance: GalleryAppearance | null;
  seoTitle: string | null;
  seoDescription: string | null;
  showBranding: boolean;
  // totalClicks removed — compute via COUNT(*) on link_gallery_clicks to avoid drift
  createdAt: Date;
  updatedAt: Date;
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
