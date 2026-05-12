export const designSystem = {
  branding: {
    colorScheme: "light" as const,
    fonts: [
      {
        family: "Geist",
        role: "body" as const,
      },
      {
        family: "instrument",
        role: "unknown" as const,
      },
    ],
    colors: {
      primary: "#433BFF",
      secondary: "#DEDCFF",
      accent: "#27CE7A",
      background: "#FBFBFE",
      textPrimary: "#0F172A",
      link: "#433BFF",
    },
    typography: {
      fontFamilies: {
        primary: "Geist",
        heading: "Geist",
      },
      fontStacks: {
        heading: ["instrument"],
        body: ["Geist", "sans-serif"],
        paragraph: ["Geist"],
      },
      fontSizes: {
        h1: "48px",
        h2: "18px",
        body: "14px",
      },
    },
    spacing: {
      baseUnit: 4,
      borderRadius: "12px",
    },
    components: {
      input: {
        background: "transparent",
        textColor: "#0D0D0D",
        borderColor: null,
        borderRadius: "0px",
        borderRadiusCorners: {
          topLeft: "0px",
          topRight: "0px",
          bottomRight: "0px",
          bottomLeft: "0px",
        },
        shadow: "none",
      },
      buttonPrimary: {
        background: "#0F172A",
        textColor: "#FFFFFF",
        borderColor: "#0D0D0D",
        borderRadius: "12px",
        borderRadiusCorners: {
          topLeft: "12px",
          topRight: "12px",
          bottomRight: "12px",
          bottomLeft: "12px",
        },
        shadow:
          "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.03) 0px 3px 3px -1.5px, rgba(0, 0, 0, 0.03) 0px 6px 6px -3px, rgba(0, 0, 0, 0.03) 0px 12px 12px -6px",
      },
      buttonSecondary: {
        background: "#FFFFFF",
        textColor: "#000000",
        borderRadius: "0px",
        borderRadiusCorners: {
          topLeft: "0px",
          topRight: "0px",
          bottomRight: "0px",
          bottomLeft: "0px",
        },
        shadow: "none",
      },
    },
  },
} as const;

// Export individual sections for easier imports
export const { branding } = designSystem;
export const { colors, typography, spacing, components } = branding;

// Helper functions for accessing design tokens
export const getColor = (colorName: keyof typeof colors) => colors[colorName];
export const getTypography = (key: keyof typeof typography) => typography[key];
export const getSpacing = (key: keyof typeof spacing) => spacing[key];
export const getComponentStyles = (componentName: keyof typeof components) => components[componentName];

// Type exports for TypeScript support
export type ColorName = keyof typeof colors;
export type ComponentName = keyof typeof components;
export type FontStack = keyof typeof typography.fontStacks;
export type FontSize = keyof typeof typography.fontSizes;
