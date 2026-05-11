import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body className="bg-dark-950 text-foreground antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
