"use client";

import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Typography } from "@/components/ui";
import { designSystem } from "@/lib/design-system";

export function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <Typography variant="h1" as="h1">
            LinkForge Design System
          </Typography>
          <Typography variant="body" as="p" className="text-gray-600 max-w-2xl mx-auto">
            A comprehensive design system that provides consistent branding, colors, typography, 
            and components across the entire LinkForge platform.
          </Typography>
        </div>

        {/* Color Palette */}
        <Card variant="design">
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>
              Primary colors used throughout the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(designSystem.branding.colors).map(([name, value]) => (
                <div key={name} className="text-center">
                  <div 
                    className="w-full h-20 rounded-lg border border-gray-200 mb-2"
                    style={{ backgroundColor: value }}
                  />
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-gray-500">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card variant="design">
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>
              Text styles and font families
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Typography variant="h1" as="h1">Heading 1 - 48px</Typography>
              <p className="text-sm text-gray-500 mt-1">Font: Geist</p>
            </div>
            <div>
              <Typography variant="h2" as="h2">Heading 2 - 18px</Typography>
              <p className="text-sm text-gray-500 mt-1">Font: Geist</p>
            </div>
            <div>
              <Typography variant="body" as="p">
                Body text - 14px. This is the standard body text used throughout the application. 
                It uses the Geist font family for optimal readability.
              </Typography>
              <p className="text-sm text-gray-500 mt-1">Font: Geist</p>
            </div>
            <div>
              <Typography variant="instrument" as="p">
                Instrument font style for special headings and accents.
              </Typography>
              <p className="text-sm text-gray-500 mt-1">Font: Instrument</p>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card variant="design">
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>
              Various button styles and states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="link">Link Button</Button>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button variant="default" size="sm">Small Primary</Button>
              <Button variant="default" size="default">Default Primary</Button>
              <Button variant="default" size="lg">Large Primary</Button>
            </div>
          </CardContent>
        </Card>

        {/* Input Components */}
        <Card variant="design">
          <CardHeader>
            <CardTitle>Input Components</CardTitle>
            <CardDescription>
              Form input styles and variations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Input</label>
              <Input placeholder="Enter text here..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Design Input</label>
              <Input placeholder="Design style input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Disabled Input</label>
              <Input placeholder="Disabled input" disabled />
            </div>
          </CardContent>
        </Card>

        {/* Spacing System */}
        <Card variant="design">
          <CardHeader>
            <CardTitle>Spacing System</CardTitle>
            <CardDescription>
              Consistent spacing based on a 4px base unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-primary rounded"></div>
                <span className="text-sm">Base unit: 4px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded"></div>
                <span className="text-sm">4 units: 16px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-primary rounded"></div>
                <span className="text-sm">6 units: 24px</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 bg-primary rounded"></div>
                <span className="text-sm">8 units: 32px</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Example */}
        <Card variant="design">
          <CardHeader>
            <CardTitle>Usage Example</CardTitle>
            <CardDescription>
              How to use the design system in your components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg p-4">
              <pre className="text-sm overflow-x-auto">
{`import { Button, Input, Card, Typography } from "@/components/ui";
import { designSystem } from "@/lib/design-system";

// Use design system colors
const primaryColor = designSystem.branding.colors.primary;

// Use components with design system variants
<Button variant="primary" size="lg">
  Get Started
</Button>

<Typography variant="h1">
  Welcome to LinkForge
</Typography>`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
