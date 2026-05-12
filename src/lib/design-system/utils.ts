import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { designSystem } from "./index";

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button variants using the design system
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        primary: `
          bg-[var(--ds-button-primary-bg)]
          text-[var(--ds-button-primary-text)]
          border-[var(--ds-button-primary-border)]
          rounded-[var(--ds-button-primary-radius)]
          shadow-[var(--ds-button-primary-shadow)]
          hover:bg-opacity-90
          transition-all duration-200
        `,
        secondary: `
          bg-[var(--ds-button-secondary-bg)]
          text-[var(--ds-button-secondary-text)]
          rounded-[var(--ds-button-secondary-radius)]
          border border-gray-200
          hover:bg-gray-50
          transition-all duration-200
        `,
        outline: `
          border border-gray-200
          bg-white
          text-gray-900
          hover:bg-gray-50
          transition-all duration-200
        `,
        ghost: `
          hover:bg-gray-100
          text-gray-900
          transition-all duration-200
        `,
        link: `
          text-[var(--ds-link)]
          underline-offset-4
          hover:underline
          transition-all duration-200
        `,
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

// Input variants using the design system
export const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: `
          bg-[var(--ds-input-bg)]
          text-[var(--ds-input-text)]
          border-[var(--ds-input-border)]
          rounded-[var(--ds-input-radius)]
        `,
        design: `
          bg-transparent
          text-[var(--ds-input-text)]
          border-0
          border-b-2 border-gray-200
          rounded-none
          px-0
          focus:border-[var(--ds-accent)]
        `,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Card variants using the design system
export const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: `
          bg-white
          border-gray-200
          shadow-sm
        `,
        elevated: `
          bg-white
          border-gray-200
          shadow-lg
        `,
        design: `
          bg-[var(--ds-background)]
          border-gray-200
          rounded-[var(--ds-border-radius)]
        `,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Typography utilities
export const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: `
        font-[var(--ds-font-heading)]
        text-[var(--ds-font-size-h1)]
        text-[var(--ds-text-primary)]
        font-bold
        leading-tight
      `,
      h2: `
        font-[var(--ds-font-heading)]
        text-[var(--ds-font-size-h2)]
        text-[var(--ds-text-primary)]
        font-semibold
        leading-tight
      `,
      body: `
        font-[var(--ds-font-primary)]
        text-[var(--ds-font-size-body)]
        text-[var(--ds-text-primary)]
        leading-normal
      `,
      instrument: `
        font-[var(--ds-font-instrument)]
        text-lg
        text-[var(--ds-text-primary)]
      `,
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

// Helper functions for getting CSS variable values
export const getCSSVariable = (variable: string): string => {
  if (typeof window !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }
  return "";
};

// Helper function to set CSS variables dynamically
export const setCSSVariable = (variable: string, value: string): void => {
  if (typeof window !== "undefined") {
    document.documentElement.style.setProperty(variable, value);
  }
};

// Spacing utilities based on design system base unit
export const getSpacing = (multiplier: number): string => {
  return `${designSystem.branding.spacing.baseUnit * multiplier}px`;
};

// Color utilities
export const getColorValue = (colorName: keyof typeof designSystem.branding.colors): string => {
  return designSystem.branding.colors[colorName];
};

// Component style utilities
export const getComponentStyles = (componentName: keyof typeof designSystem.branding.components) => {
  return designSystem.branding.components[componentName];
};

// Type exports
export type ButtonVariants = VariantProps<typeof buttonVariants>;
export type InputVariants = VariantProps<typeof inputVariants>;
export type CardVariants = VariantProps<typeof cardVariants>;
export type TypographyVariants = VariantProps<typeof typographyVariants>;
