# LinkForge Design System

A comprehensive design system that provides consistent branding, colors, typography, and components across the entire LinkForge platform.

## Overview

The design system is based on the branding specifications provided and includes:

- **Colors**: Primary, secondary, accent, and semantic colors
- **Typography**: Geist and Instrument font families with defined sizes
- **Spacing**: 4px base unit system
- **Components**: Pre-built UI components with design system variants
- **CSS Variables**: Global access to design tokens

## Structure

```
src/lib/design-system/
├── index.ts          # Main design system configuration
├── utils.ts          # Component variants and utilities
└── README.md         # This documentation

src/components/ui/
├── Button.tsx        # Button component with variants
├── Input.tsx         # Input component with variants
├── Card.tsx          # Card component with variants
├── Typography.tsx    # Typography component
└── index.ts          # Component exports
```

## Usage

### Importing Components

```tsx
import { Button, Input, Card, Typography } from "@/components/ui";
```

### Using Design System Colors

```tsx
import { designSystem } from "@/lib/design-system";

// Access colors
const primaryColor = designSystem.branding.colors.primary;
const accentColor = designSystem.branding.colors.accent;

// Use in styles
<div style={{ backgroundColor: primaryColor }}>
  Content
</div>
```

### CSS Variables

The design system exposes CSS variables for global access:

```css
.my-component {
  background-color: var(--ds-primary);
  color: var(--ds-text-primary);
  font-family: var(--ds-font-primary);
  border-radius: var(--ds-border-radius);
}
```

### Component Variants

#### Button

```tsx
<Button variant="primary" size="lg">
  Get Started
</Button>

<Button variant="secondary" size="sm">
  Cancel
</Button>

<Button variant="outline">
  Learn More
</Button>
```

#### Input

```tsx
<Input placeholder="Enter email..." />
<Input variant="design" placeholder="Design style" />
```

#### Card

```tsx
<Card variant="design">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

#### Typography

```tsx
<Typography variant="h1" as="h1">
  Main Heading
</Typography>

<Typography variant="body" as="p">
  Body text content
</Typography>

<Typography variant="instrument" as="p">
  Special heading text
</Typography>
```

## Design Tokens

### Colors

- `--ds-primary`: #0F172A
- `--ds-secondary`: #334155
- `--ds-accent`: #00AA45
- `--ds-background`: #FFFFFF
- `--ds-text-primary`: #000000
- `--ds-link`: #00AA45

### Typography

- `--ds-font-primary`: "Geist", sans-serif
- `--ds-font-heading`: "Geist", sans-serif
- `--ds-font-instrument`: "instrument", sans-serif
- `--ds-font-size-h1`: 48px
- `--ds-font-size-h2`: 18px
- `--ds-font-size-body`: 14px

### Spacing

- `--ds-spacing-base`: 4px
- `--ds-border-radius`: 12px

### Component Styles

- `--ds-button-primary-bg`: #0F172A
- `--ds-button-primary-text`: #FFFFFF
- `--ds-input-bg`: transparent
- `--ds-input-text`: #0D0D0D

## Tailwind Integration

The design system is integrated with Tailwind CSS and provides:

```tsx
// Color classes
<div className="bg-primary text-accent">

// Font classes
<div className="font-geist font-instrument">

// Font size classes
<div className="text-h1 text-h2 text-body">

// Spacing classes
<div className="rounded-design">

// Component variants
<Button variant="primary" className="rounded-design">
```

## Helper Functions

```tsx
import { 
  getColorValue, 
  getSpacing, 
  getComponentStyles,
  getCSSVariable,
  setCSSVariable 
} from "@/lib/design-system/utils";

// Get color value
const primaryColor = getColorValue('primary');

// Get spacing value
const spacing = getSpacing(4); // 16px

// Get component styles
const buttonStyles = getComponentStyles('buttonPrimary');

// Get/set CSS variables
const currentPrimary = getCSSVariable('--ds-primary');
setCSSVariable('--ds-primary', '#new-color');
```

## Best Practices

1. **Use Components**: Prefer the pre-built UI components over raw HTML elements
2. **Semantic Variants**: Use semantic variant names (primary, secondary, etc.)
3. **Responsive Design**: Combine with Tailwind's responsive utilities
4. **Consistency**: Use design system tokens instead of hard-coded values
5. **Accessibility**: All components include proper ARIA attributes and focus states

## Customization

To customize the design system:

1. **Update Configuration**: Modify `src/lib/design-system/index.ts`
2. **Add Variants**: Extend component variants in `src/lib/design-system/utils.ts`
3. **CSS Variables**: Add new CSS variables in `src/app/globals.css`
4. **Tailwind Config**: Update `tailwind.config.ts` for new utilities

## Example Component

See `src/components/examples/DesignSystemShowcase.tsx` for a comprehensive example of all design system features in action.
