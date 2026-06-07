import type { Metadata, Viewport } from "next";
import { Inter, Geist, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { RouteProvider } from "@/providers/route-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "PivotUrl — Branded Link Shortener",
    template: "%s | PivotUrl",
  },
  description:
    "Shorten, brand, and track links at scale. The most powerful link management platform for teams.",
  keywords: ["link shortener", "branded links", "url shortener", "link analytics", "custom domains"],
  authors: [{ name: "PivotUrl" }],
  creator: "PivotUrl",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "PivotUrl",
    title: "PivotUrl — Branded Link Shortener",
    description: "Shorten, brand, and track links at scale.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PivotUrl",
    description: "Shorten, brand, and track links at scale.",
    creator: "@pivoturl",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("scroll-smooth", inter.variable, "font-sans", geist.variable, jetbrainsMono.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[var(--bg)] antialiased" suppressHydrationWarning>
        <PostHogProvider>
        <ClerkProvider>
          <RouteProvider>
            <ThemeProvider>
              <Providers>
                {children}
                <Analytics />
                <Toaster richColors closeButton />
              </Providers>
            </ThemeProvider>
          </RouteProvider>
        </ClerkProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
