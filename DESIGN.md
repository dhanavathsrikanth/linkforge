---
version: alpha

name: LinkForge

description: A modern link-in-bio platform with a clean, professional aesthetic featuring electric indigo accents and generous whitespace.

colors:
  # Primary palette
  primary: "#433BFF"
  primary-light: "#5B52FF"
  primary-dark: "#2F28CC"
  
  # Secondary/Surface palette
  secondary: "#DEDCFF"
  surface: "#FFFFFF"
  surface-2: "#DEDCFF"
  background: "#FBFBFE"
  background-2: "#FFFFFF"
  
  # Neutral scale
  neutral-50: "#F8FAFC"
  neutral-100: "#F1F5F9"
  neutral-200: "#E2E8F0"
  neutral-300: "#CBD5E1"
  neutral-400: "#94A3B8"
  neutral-500: "#64748B"
  neutral-600: "#475569"
  neutral-700: "#334155"
  neutral-800: "#1E293B"
  neutral-900: "#0F172A"
  neutral-950: "#020617"
  
  # Accent colors
  accent: "#27CE7A"
  success: "#27CE7A"
  warning: "#fbbf24"
  error: "#EF4444"
  
  # Text colors
  text-primary: "#0F172A"
  text-secondary: "#64748B"
  text-muted: "#64748B"
  text-disabled: "#94A3B8"
  text-on-primary: "#FFFFFF"
  
  # Utility colors
  link: "#433BFF"
  border: "rgba(15, 23, 42, 0.08)"
  border-2: "rgba(15, 23, 42, 0.14)"
  border-strong: "#CBD5E1"
  
  # Dark theme colors
  dark-950: "#09090b"
  dark-900: "#141418"
  dark-800: "#1c1c24"
  dark-700: "#27272f"
  dark-600: "#3f3f50"

typography:
  # Display/Heading styles
  headline-display:
    fontFamily: "Geist"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  
  headline-lg:
    fontFamily: "Geist"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  
  headline-md:
    fontFamily: "Geist"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  
  # Body styles
  body-lg:
    fontFamily: "Geist"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  
  body-md:
    fontFamily: "Geist"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  
  body-sm:
    fontFamily: "Geist"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  
  # Label styles
  label-lg:
    fontFamily: "Geist"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  
  label-md:
    fontFamily: "Geist"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  
  label-sm:
    fontFamily: "Geist"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.02em
  
  # Special fonts
  instrument:
    fontFamily: "instrument"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.4
  
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5

rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 12px
  xl: 16px
  2xl: 24px
  full: 9999px

spacing:
  base: 4px
  0: 0px
  0.5: 2px
  1: 4px
  1.5: 6px
  2: 8px
  2.5: 10px
  3: 12px
  3.5: 14px
  4: 16px
  5: 20px
  6: 24px
  7: 28px
  8: 32px
  9: 36px
  10: 40px
  11: 44px
  12: 48px
  16: 64px
  20: 80px
  24: 96px

components:
  # Button variants
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.3}"
    fontSize: "{typography.label-lg.fontSize}"
    fontWeight: 600
  
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.text-on-primary}"
  
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: "{spacing.3}"
    fontSize: "{typography.label-lg.fontSize}"
  
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2}"
  
  # Input styles
  input:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    border: "none"
    rounded: "{rounded.none}"
    padding: "{spacing.3}"
  
  input-outlined:
    backgroundColor: "{colors.background-2}"
    textColor: "{colors.text-primary}"
    border: "1px solid {colors.border-strong}"
    rounded: "{rounded.md}"
    padding: "{spacing.3}"
  
  # Card styles
  card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.4}"
  
  card-elevated:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.xl}"
    padding: "{spacing.6}"
  
  # List/Item styles
  list-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.3}"
  
  # Navigation styles
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "{spacing.2} {spacing.3}"
  
  nav-item-active:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"

---

# LinkForge Design System

## Overview

LinkForge is a modern link-in-bio platform designed for creators, professionals, and businesses who want to consolidate their online presence into a single, elegant destination. The design philosophy centers on **clarity, confidence, and conversion**.

**Brand Personality:**
- **Professional yet approachable** — Clean interfaces that don't feel sterile
- **Modern but timeless** — Current design trends without being trendy
- **Bold yet refined** — Strong visual presence through intentional restraint

**Target Audience:** Content creators, influencers, small business owners, and professionals who value aesthetic presentation and ease of use.

**Emotional Response:** Users should feel empowered and sophisticated. The interface should instill confidence that their link-in-bio page will make a strong impression.

## Colors

The LinkForge color system balances high-contrast neutrals with an electric indigo primary that creates visual energy without overwhelming.

### Primary Palette
- **Primary (#433BFF):** Electric indigo — the signature brand color. Used for primary actions, links, and key interactive elements. Commands attention without aggression.
- **Primary Light (#5B52FF):** A brighter variant for hover states and gradients.
- **Primary Dark (#2F28CC):** Deeper indigo for pressed states and emphasis.

### Secondary/Surface Palette
- **Secondary (#DEDCFF):** Soft lavender tint — used for subtle backgrounds, badges, and hover highlights. Creates a cohesive, branded atmosphere.
- **Surface (#FFFFFF):** Pure white for cards and elevated elements.
- **Surface-2 (#DEDCFF):** Secondary surface for alternating sections and highlights.
- **Background (#FBFBFE):** Nearly-white with a subtle cool tint — the main canvas.
- **Background-2 (#FFFFFF):** Alternative background for contrast.

### Neutral Scale
A systematic gray scale from near-black to near-white, used for text hierarchy, borders, and subtle backgrounds. The scale progresses from `neutral-50` (lightest) to `neutral-950` (darkest).

### Accent Colors
- **Success (#27CE7A):** Emerald green for positive states and confirmations.
- **Warning (#fbbf24):** Amber for cautionary states.
- **Error (#EF4444):** Red for errors and destructive actions.

### Text Colors
- **Text Primary (#0F172A):** Near-black for headings and body text.
- **Text Secondary (#64748B):** Muted gray for captions and metadata.
- **Text Muted (#64748B):** Same as secondary, for de-emphasized content.
- **Text On Primary (#FFFFFF):** White text on primary backgrounds.

### Dark Theme
A carefully crafted dark palette using desaturated purple-grays:
- **Dark 950 (#09090b):** Deepest background
- **Dark 900 (#141418):** Primary dark surface
- **Dark 800 (#1c1c24):** Elevated dark surfaces
- **Dark 700 (#27272f):** Borders and dividers in dark mode

## Typography

LinkForge uses **Geist** as the primary typeface — a modern, highly legible sans-serif that performs beautifully at all sizes. **Instrument** is used for decorative/heading accents when a more distinctive voice is needed.

### Headline Styles
- **Headline Display (48px):** Page titles and hero text. Bold weight with tight letter-spacing for impact.
- **Headline Large (36px):** Section headers and major headings.
- **Headline Medium (24px):** Subsection headers and card titles.

### Body Styles
- **Body Large (18px):** Featured paragraphs and important content.
- **Body Medium (16px):** Standard paragraph text — the workhorse size.
- **Body Small (14px):** Compact text for dense UIs and metadata.

### Label Styles
- **Label Large (14px):** Button text, navigation items, form labels. Semi-bold weight.
- **Label Medium (12px):** Small labels, tags, timestamps.
- **Label Small (11px):** Captions, helper text, fine print.

### Monospace
- **Mono (14px):** JetBrains Mono for code snippets and technical data.

**Typography Principles:**
- Maintain tight negative letter-spacing on large headings (-0.02em)
- Use slightly positive spacing on small labels for readability (+0.01em to +0.02em)
- Line height should be generous (1.5-1.6) for body text, tighter (1.1-1.3) for headings

## Layout

LinkForge follows a **constraint-based spacing system** built on a 4px base unit, ensuring pixel-perfect alignment and rhythmic consistency.

### Spacing Scale
- **Base unit:** 4px
- **Scale progression:** 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24 (multiples of 4px)

### Layout Patterns
- **Container max-width:** 1200px for main content, 640px for reading-focused sections
- **Grid system:** CSS Grid with flexible columns and consistent gutters (24px)
- **Responsive breakpoints:** Mobile-first with key breakpoints at 640px, 768px, 1024px, 1280px

### Spacing Guidelines
- Use `spacing-4` (16px) as the standard component padding
- Use `spacing-6` (24px) for section separation
- Use `spacing-2` (8px) for tight component groupings
- Never use arbitrary pixel values — always reference the spacing scale

## Elevation & Depth

LinkForge uses a **subtle, modern approach to elevation** that favors clean borders over heavy shadows, creating a flat-yet-layered aesthetic.

### Shadow System
- **Shadow SM:** `0 1px 2px rgba(15,23,42,0.08)` — Micro-elevation for buttons, inputs
- **Shadow MD:** `0 4px 16px rgba(15,23,42,0.1)` — Cards, modals, dropdowns
- **Shadow Glow:** `0 0 32px rgba(67, 59, 255, 0.25)` — Brand-accented glow for focus states

### Depth Principles
- Elevation is achieved primarily through **surface color changes** and **subtle borders**
- Cards sit on the background with 1px borders rather than heavy drop shadows
- Primary actions receive subtle shadow elevation on hover
- Focus states use the brand glow shadow for accessibility and brand reinforcement

## Shapes

The LinkForge shape language balances **friendly curves** with **professional structure**.

### Border Radius Scale
- **None (0px):** Sharp corners for secondary buttons, minimal aesthetic
- **Small (6px):** Subtle rounding for small elements
- **Medium (10px):** Default for inputs, tags, small cards
- **Large (12px):** Primary buttons, cards, main containers
- **XL (16px):** Large cards, modals, prominent sections
- **2XL (24px):** Hero sections, feature highlights
- **Full (9999px):** Pills, avatars, circular elements

### Shape Guidelines
- Primary buttons use `rounded-lg` (12px) for approachable authority
- Secondary buttons use `rounded-none` for stark contrast
- Cards and containers use `rounded-lg` to `rounded-xl` for a modern feel
- Inputs can vary between `rounded-none` (minimal) and `rounded-md` (friendly)

## Components

### Buttons

**Primary Button**
- Background: Electric indigo (`{colors.primary}`)
- Text: White, semi-bold
- Border radius: 12px (`{rounded.lg}`)
- Padding: 12px (`{spacing.3}`)
- Shadow: Subtle elevation with soft blur

**Secondary Button**
- Background: White (`{colors.surface}`)
- Text: Dark (`{colors.text-primary}`)
- Border radius: 0px (sharp, minimal)
- No shadow for flat appearance

**Ghost Button**
- Background: Transparent
- Text: Primary color
- Hover: Secondary background tint

### Inputs

**Minimal Input**
- Background: Transparent
- Border: None (borderless design)
- Border radius: 0px
- Focus: Bottom border accent or ring

**Outlined Input**
- Background: White
- Border: 1px solid neutral-300
- Border radius: 10px (`{rounded.md}`)
- Focus: Primary color ring

### Cards

**Standard Card**
- Background: White
- Border: 1px subtle border
- Border radius: 12px
- Padding: 16px

**Elevated Card**
- Background: White
- Border radius: 16px
- Padding: 24px
- Shadow: Medium elevation

### Lists

**List Items**
- Transparent background
- Hover: Secondary tint background
- Border radius: 10px
- Padding: 12px

### Navigation

**Nav Items**
- Default: Muted text, transparent background
- Active: Primary text on secondary tint background
- Border radius: 10px

## Do's and Don'ts

### Do
- Use the primary color only for the single most important action per screen
- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Use consistent spacing values from the 4px scale
- Apply the `rounded-lg` (12px) radius to primary interactive elements
- Use generous whitespace to create breathing room around content
- Leverage the secondary lavender tint for subtle brand presence

### Don't
- Don't mix rounded and sharp corners arbitrarily — follow the component guidelines
- Don't use more than two font weights on a single screen
- Don't use arbitrary colors outside the defined palette
- Don't use heavy shadows on multiple overlapping elements
- Don't reduce line height below 1.4 for body text
- Don't use the accent green (#27CE7A) for primary actions — reserve it for success states

## Consumer Behavior for Unknown Content

This DESIGN.md follows the Stitch specification and can be extended for LinkForge-specific needs:

- Additional component variants can be added under `components:`
- Custom sections beyond the canonical 8 can be added for specific features (e.g., "## Iconography")
- New color tokens follow the same hex format
- Typography tokens accept all standard CSS font properties

When extending:
- Preserve token reference syntax: `{colors.primary}`, `{rounded.lg}`, etc.
- Maintain the 4px spacing grid for consistency
- Document custom sections in the markdown body for human context
