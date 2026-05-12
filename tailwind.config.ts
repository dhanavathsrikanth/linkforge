import type { Config } from "tailwindcss";
import { designSystem } from "./src/lib/design-system";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        primary: designSystem.branding.colors.primary,
        secondary: designSystem.branding.colors.secondary,
        accent: designSystem.branding.colors.accent,
        "text-primary": designSystem.branding.colors.textPrimary,
        link: designSystem.branding.colors.link,
        
        // New UI Shell Colors
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        shellBorder: "var(--border)",
        shellBorder2: "var(--border2)",
        shellText: "var(--text)",
        muted: "var(--muted)",
        blue: "var(--blue)",
        green: "var(--green)",
        violet: "var(--violet)",
        amber: "var(--amber)",
        
        // Preserve existing brand colors for dark theme
        brand: {
          blue:   "#2563eb",
          violet: "#7c3aed",
          "blue-light":   "#3b82f6",
          "violet-light": "#8b5cf6",
        },
        dark: {
          950: "#09090b",
          900: "#141418",
          800: "#1c1c24",
          700: "#27272f",
          600: "#3f3f50",
        },
        border: "hsl(240 6% 20%)",
        input:  "hsl(240 6% 18%)",
        ring:   "hsl(252 76% 57%)",
        foreground:        "hsl(0 0% 95%)",
        "muted-foreground":"hsl(240 5% 55%)",
      },
      fontFamily: {
        // Design System Fonts
        geist: ["Geist", "sans-serif"],
        instrument: ["instrument", "sans-serif"],
        
        // Preserve existing fonts
        sans: [
          "Geist",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      fontSize: {
        // Design System Font Sizes
        "h1": designSystem.branding.typography.fontSizes.h1,
        "h2": designSystem.branding.typography.fontSizes.h2,
        "body": designSystem.branding.typography.fontSizes.body,
      },
      spacing: {
        // Design System Base Unit (4px) scaled up
        "0.5": "2px",   // 0.5 * 4
        "1": "4px",     // 1 * 4
        "1.5": "6px",   // 1.5 * 4
        "2": "8px",     // 2 * 4
        "2.5": "10px",  // 2.5 * 4
        "3": "12px",    // 3 * 4
        "3.5": "14px",  // 3.5 * 4
        "4": "16px",    // 4 * 4
        "5": "20px",    // 5 * 4
        "6": "24px",    // 6 * 4
        "7": "28px",    // 7 * 4
        "8": "32px",    // 8 * 4
        "9": "36px",    // 9 * 4
        "10": "40px",   // 10 * 4
        "11": "44px",   // 11 * 4
        "12": "48px",   // 12 * 4
      },
      borderRadius: {
        // Design System Border Radius
        "design": designSystem.branding.spacing.borderRadius,
        "4xl": "2rem",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
        "gradient-dark":
          "linear-gradient(180deg, #141418 0%, #09090b 100%)",
        "gradient-glow":
          "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease-out both",
        "slide-up":   "slideUp 0.4s ease-out both",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow":  "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124,58,237,0)" },
          "50%":       { boxShadow: "0 0 24px 4px rgba(124,58,237,0.4)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
    },
  },
  plugins: [],
};

export default config;
