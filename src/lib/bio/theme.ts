export interface HSLColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}

export interface BioThemeColors {
  colorBgBase: HSLColor;
  colorBgPrimary: HSLColor;
  colorBgSecondary: HSLColor;
  colorBorderPrimary: HSLColor;
  colorTitlePrimary: HSLColor;
  colorTitleSecondary: HSLColor;
  colorLabelPrimary: HSLColor;
  colorLabelSecondary: HSLColor;
  colorLabelTertiary: HSLColor;
}

export interface BioTheme {
  id: string;
  name: string;
  isDefault: boolean;
  colors: BioThemeColors;
  font: string | null;
  backgroundImage: string | null;
}

export type ThemeName = "Default" | "Purple" | "Black" | "Forest" | "Lilac" | "OrangePunch";

export function hslToCssValue(color?: HSLColor | null): string {
  if (!color) return "";
  const { h, s, l, a } = color;
  if (a !== undefined) {
    return `${h}deg ${s * 100}% ${l * 100}% / ${a}`;
  }
  return `${h}deg ${s * 100}% ${l * 100}%`;
}

export function hslToHex({ h, s, l }: HSLColor): string {
  const l2 = l / 100;
  const a2 = (s * Math.min(l2, 1 - l2)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l2 - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const DEFAULT_THEMES: Record<ThemeName, { id: string; colors: BioThemeColors; font: string | null; backgroundImage: null }> = {
  Default: {
    id: "theme-default",
    colors: {
      colorBgBase: { h: 60, l: 0.96, s: 0.0476 },
      colorBgPrimary: { h: 0, l: 1, s: 0 },
      colorBgSecondary: { h: 0, l: 0.902, s: 0 },
      colorBorderPrimary: { h: 0, l: 0.9176, s: 0 },
      colorLabelPrimary: { h: 240, l: 0.1137, s: 0.0345 },
      colorLabelSecondary: { h: 0, l: 0.16, s: 0 },
      colorLabelTertiary: { h: 0, l: 0.9804, s: 0 },
      colorTitlePrimary: { h: 240, l: 0.1137, s: 0.0345 },
      colorTitleSecondary: { h: 0, l: 0.16, s: 0 },
    },
    font: null,
    backgroundImage: null,
  },
  Purple: {
    id: "theme-purple",
    colors: {
      colorBgBase: { h: 255.48, l: 0.202, s: 0.301 },
      colorBgPrimary: { h: 255, l: 0.135, s: 0.29 },
      colorBgSecondary: { h: 0, l: 0, s: 0 },
      colorBorderPrimary: { h: 253.55, l: 0.2837, s: 0.1969 },
      colorLabelPrimary: { h: 0, l: 1, s: 0 },
      colorLabelSecondary: { h: 293.33, l: 0.7627, s: 0.0744 },
      colorLabelTertiary: { h: 0, l: 0.9804, s: 0 },
      colorTitlePrimary: { h: 0, l: 1, s: 0 },
      colorTitleSecondary: { h: 293.33, l: 0.7627, s: 0.0744 },
    },
    font: null,
    backgroundImage: null,
  },
  Black: {
    id: "theme-black",
    colors: {
      colorBgBase: { h: 0, l: 0, s: 0 },
      colorBgPrimary: { h: 0, l: 0, s: 0 },
      colorBgSecondary: { h: 0, l: 0.902, s: 0 },
      colorBorderPrimary: { h: 0, l: 0.1607, s: 0 },
      colorLabelPrimary: { h: 0, l: 1, s: 0 },
      colorLabelSecondary: { h: 0, l: 0.9804, s: 0 },
      colorLabelTertiary: { h: 0, l: 0.9804, s: 0 },
      colorTitlePrimary: { h: 0, l: 1, s: 0 },
      colorTitleSecondary: { h: 0, l: 0.9804, s: 0 },
    },
    font: null,
    backgroundImage: null,
  },
  Forest: {
    id: "theme-forest",
    colors: {
      colorBgBase: { h: 141.18, l: 0.41, s: 0.0813 },
      colorBgPrimary: { h: 140, l: 0.31, s: 0.0988 },
      colorBgSecondary: { h: 0, l: 0.902, s: 0 },
      colorBorderPrimary: { h: 140, l: 0.31, s: 0.0988 },
      colorLabelPrimary: { h: 0, l: 1, s: 0 },
      colorLabelSecondary: { h: 141.18, l: 0.8392, s: 0.4146 },
      colorLabelTertiary: { h: 0, l: 0.9804, s: 0 },
      colorTitlePrimary: { h: 0, l: 1, s: 0 },
      colorTitleSecondary: { h: 141.18, l: 0.8392, s: 0.4146 },
    },
    font: null,
    backgroundImage: null,
  },
  Lilac: {
    id: "theme-lilac",
    colors: {
      colorBgBase: { a: 1, h: 244.86, l: 0.85, s: 1 },
      colorBgPrimary: { h: 244.86, l: 0.92, s: 0.91 },
      colorBgSecondary: { h: 0, l: 0, s: 0 },
      colorBorderPrimary: { h: 244.86, l: 0.76, s: 0.48 },
      colorLabelPrimary: { h: 250.0, l: 0.18, s: 0.32 },
      colorLabelSecondary: { h: 250.0, l: 0.18, s: 0.32 },
      colorLabelTertiary: { h: 250.0, l: 0.18, s: 0.32 },
      colorTitlePrimary: { h: 250.0, l: 0.18, s: 0.32 },
      colorTitleSecondary: { h: 250.0, l: 0.18, s: 0.32 },
    },
    font: null,
    backgroundImage: null,
  },
  OrangePunch: {
    id: "theme-orange-punch",
    colors: {
      colorBgBase: { h: 226.15, l: 0.1, s: 0.48 },
      colorBgPrimary: { h: 13.5, l: 0.53, s: 0.67 },
      colorBgSecondary: { h: 33.3, l: 0.48, s: 0.95 },
      colorBorderPrimary: { h: 226.15, l: 0.1, s: 0.48 },
      colorLabelPrimary: { h: 144, l: 0.69, s: 0.78 },
      colorLabelSecondary: { h: 144, l: 0.97, s: 0.76 },
      colorLabelTertiary: { h: 144, l: 0.98, s: 0 },
      colorTitlePrimary: { h: 144, l: 0.69, s: 0.78 },
      colorTitleSecondary: { h: 144, l: 0.97, s: 0.76 },
    },
    font: null,
    backgroundImage: null,
  },
};

export const THEME_CSS_VARIABLES = [
  { id: "colorBgBase", variable: "--bio-bg-base", label: "Page background" },
  { id: "colorBgPrimary", variable: "--bio-bg-primary", label: "Card background" },
  { id: "colorBgSecondary", variable: "--bio-bg-secondary", label: "Secondary bg" },
  { id: "colorBorderPrimary", variable: "--bio-border", label: "Border" },
  { id: "colorTitlePrimary", variable: "--bio-title-primary", label: "Title" },
  { id: "colorTitleSecondary", variable: "--bio-title-secondary", label: "Subtitle" },
  { id: "colorLabelPrimary", variable: "--bio-label-primary", label: "Primary text" },
  { id: "colorLabelSecondary", variable: "--bio-label-secondary", label: "Secondary text" },
  { id: "colorLabelTertiary", variable: "--bio-label-tertiary", label: "Tertiary text" },
] as const;

export function generateThemeCss(colors: BioThemeColors, font?: string | null, backgroundImage?: string | null): string {
  const vars = THEME_CSS_VARIABLES.map(
    ({ id, variable }) => `${variable}: ${hslToCssValue((colors as any)[id])};`
  ).join("\n");

  const fontFamily = font ? `--bio-font: '${font}', sans-serif;` : "";
  const bgImage = backgroundImage ? `background-image: url(${backgroundImage});` : "";

  return `:root {\n${vars}\n${fontFamily}\n}\n.app-page {\nbackground-size: cover;\nbackground-position: center;\nbackground-repeat: no-repeat;\nbackground-attachment: fixed;\n${bgImage}\n}`;
}

/**
 * Generate CSS that sets the --sys-* variables used by the new bio block system.
 * Scoped to a selector (default: `:root`) so it can be used on both the
 * public page and the editor canvas.
 */
export function generateSysThemeCss(
  colors: BioThemeColors,
  font?: string | null,
  backgroundImage?: string | null,
  selector = ":root"
): string {
  const c = colors;
  const lines = [
    `--sys-bg-base:         ${hslToCssValue(c.colorBgBase)};`,
    `--sys-bg-primary:      ${hslToCssValue(c.colorBgPrimary)};`,
    `--sys-bg-secondary:    ${hslToCssValue(c.colorBgSecondary)};`,
    `--sys-bg-border:       ${hslToCssValue(c.colorBorderPrimary)};`,
    `--sys-title-primary:   ${hslToCssValue(c.colorTitlePrimary)};`,
    `--sys-title-secondary: ${hslToCssValue(c.colorTitleSecondary)};`,
    `--sys-label-primary:   ${hslToCssValue(c.colorLabelPrimary)};`,
    `--sys-label-secondary: ${hslToCssValue(c.colorLabelSecondary)};`,
    `--sys-label-tertiary:  ${hslToCssValue(c.colorLabelTertiary)};`,
    font ? `--sys-font: '${font}', sans-serif;` : "",
  ].filter(Boolean);

  let css = `${selector} {\n  ${lines.join("\n  ")}\n}`;

  if (backgroundImage) {
    css += `\n.bio-page-root {\n  background-image: url(${backgroundImage});\n  background-size: cover;\n  background-position: center;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n}`;
  }

  return css;
}

export const THEME_FIELDS = [
  "colorBgBase", "colorBgPrimary", "colorBgSecondary", "colorBorderPrimary",
  "colorTitlePrimary", "colorTitleSecondary",
  "colorLabelPrimary", "colorLabelSecondary", "colorLabelTertiary",
] as const;

export interface BioThemeRow {
  id: string;
  name: string;
  isDefault: boolean;
  workspaceId: string | null;
  createdById: string;
  font: string | null;
  backgroundImage: string | null;
  colorBgBase: HSLColor | null;
  colorBgPrimary: HSLColor | null;
  colorBgSecondary: HSLColor | null;
  colorBorderPrimary: HSLColor | null;
  colorTitlePrimary: HSLColor | null;
  colorTitleSecondary: HSLColor | null;
  colorLabelPrimary: HSLColor | null;
  colorLabelSecondary: HSLColor | null;
  colorLabelTertiary: HSLColor | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_FONTS = ["Inter", "Poppins", "Space Mono", "Playfair Display"] as const;

export function themeToAppearance(theme: {
  colorBgBase?: HSLColor | null;
  colorBgPrimary?: HSLColor | null;
  colorBgSecondary?: HSLColor | null;
  colorBorderPrimary?: HSLColor | null;
  colorTitlePrimary?: HSLColor | null;
  colorTitleSecondary?: HSLColor | null;
  colorLabelPrimary?: HSLColor | null;
  colorLabelSecondary?: HSLColor | null;
  colorLabelTertiary?: HSLColor | null;
  font?: string | null;
}): {
  bgColor: string;
  buttonColor: string;
  buttonTextColor: string;
  font: "Inter" | "Poppins" | "Space Mono" | "Playfair Display";
  bgType: "solid";
} {
  const font = theme.font ?? "Inter";
  return {
    bgColor: theme.colorBgBase ? hslToHex(theme.colorBgBase) : "#0f0f13",
    buttonColor: theme.colorBgPrimary ? hslToHex(theme.colorBgPrimary) : "#1e1e2e",
    buttonTextColor: theme.colorLabelPrimary ? hslToHex(theme.colorLabelPrimary) : "#ffffff",
    font: VALID_FONTS.includes(font as any) ? (font as "Inter" | "Poppins" | "Space Mono" | "Playfair Display") : "Inter",
    bgType: "solid",
  };
}
