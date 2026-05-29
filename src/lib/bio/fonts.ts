// ─── Font catalog ─────────────────────────────────────────────────────────────
// 16 Google Fonts matching linky's popularGoogleFonts list.
// family: URL-encoded family name for Google Fonts API
// weights: numeric weights to load
// category: CSS generic family fallback

export interface FontEntry {
  family: string;
  weights: number[];
  category: "sans-serif" | "serif" | "monospace";
}

const FONTS: Record<string, FontEntry> = {
  // ── Sans-serif ──────────────────────────────────────────────────────────────
  Inter: {
    family: "Inter",
    weights: [400, 500, 600, 700],
    category: "sans-serif",
  },
  Roboto: {
    family: "Roboto",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  "Open Sans": {
    family: "Open+Sans",
    weights: [400, 600, 700],
    category: "sans-serif",
  },
  Lato: {
    family: "Lato",
    weights: [400, 700, 900],
    category: "sans-serif",
  },
  Montserrat: {
    family: "Montserrat",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  Poppins: {
    family: "Poppins",
    weights: [400, 500, 600, 700],
    category: "sans-serif",
  },
  Raleway: {
    family: "Raleway",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  "DM Sans": {
    family: "DM+Sans",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  Nunito: {
    family: "Nunito",
    weights: [400, 600, 700],
    category: "sans-serif",
  },
  Quicksand: {
    family: "Quicksand",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  "Work Sans": {
    family: "Work+Sans",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  Rubik: {
    family: "Rubik",
    weights: [400, 500, 700],
    category: "sans-serif",
  },
  "Plus Jakarta Sans": {
    family: "Plus+Jakarta+Sans",
    weights: [400, 500, 600, 700],
    category: "sans-serif",
  },

  // ── Serif ───────────────────────────────────────────────────────────────────
  "Playfair Display": {
    family: "Playfair+Display",
    weights: [400, 500, 600, 700],
    category: "serif",
  },
  Merriweather: {
    family: "Merriweather",
    weights: [400, 700, 900],
    category: "serif",
  },

  // ── Monospace ───────────────────────────────────────────────────────────────
  "Space Mono": {
    family: "Space+Mono",
    weights: [400, 700],
    category: "monospace",
  },
  "JetBrains Mono": {
    family: "JetBrains+Mono",
    weights: [400, 500, 700],
    category: "monospace",
  },
  "DM Mono": {
    family: "DM+Mono",
    weights: [400, 500],
    category: "monospace",
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** All font names in display order */
export function getAvailableFonts(): string[] {
  return Object.keys(FONTS);
}

/** Font names filtered by category */
export function getFontsByCategory(
  category: FontEntry["category"]
): string[] {
  return Object.entries(FONTS)
    .filter(([, f]) => f.category === category)
    .map(([name]) => name);
}

/** Google Fonts stylesheet URL for a font name */
export function getGoogleFontUrl(fontName: string): string {
  const font = FONTS[fontName];
  if (!font) return "";
  const weights = font.weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${font.family}:wght@${weights}&display=swap`;
}

/** CSS font-family value including generic fallback */
export function getFontFamilyValue(fontName: string): string {
  const font = FONTS[fontName];
  if (!font) return "inherit";
  // Use the display name (with spaces), not the URL-encoded family
  return `'${fontName}', ${font.category}`;
}

/** Category of a font (for fallback) */
export function getFontCategory(fontName: string): FontEntry["category"] {
  return FONTS[fontName]?.category ?? "sans-serif";
}

/** Full FontEntry for a font name */
export function getFontEntry(fontName: string): FontEntry | undefined {
  return FONTS[fontName];
}
