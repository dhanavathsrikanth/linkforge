import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow SVG files served from /public to be used with next/image
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Allow external avatar/icon URLs used in blocks
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
