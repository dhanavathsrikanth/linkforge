import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { RouteProvider } from "@/providers/route-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "LinkForge — Branded Link Shortener",
    template: "%s | LinkForge",
  },
  description:
    "Shorten, brand, and track links at scale. The most powerful link management platform for teams.",
  keywords: ["link shortener", "branded links", "url shortener", "link analytics", "custom domains"],
  authors: [{ name: "LinkForge" }],
  creator: "LinkForge",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "LinkForge",
    title: "LinkForge — Branded Link Shortener",
    description: "Shorten, brand, and track links at scale.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkForge",
    description: "Shorten, brand, and track links at scale.",
    creator: "@linkforgeapp",
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
    <html lang="en" className={cn("scroll-smooth", inter.variable, "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[var(--bg)] antialiased" suppressHydrationWarning>
        <ClerkProvider>
          <RouteProvider>
            <ThemeProvider>
              <Providers>
                {children}
              </Providers>
            </ThemeProvider>
          </RouteProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
