import type { Config } from "tailwindcss";

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
        sans: [
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
      borderRadius: {
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
