"use client";

import Image from "next/image";
import {
  User,
  Link2,
  Layers,
  Type,
  Image as ImageIcon,
  Box,
  MapPin,
  Heart,
  Mail,
} from "lucide-react";
import { BIO_BLOCK_CATALOG, type LucideIconName } from "@/components/bio/blockCatalog";
import { cn } from "@/lib/utils";

// ─── Lucide icon lookup ───────────────────────────────────────────────────────

const LUCIDE: Record<LucideIconName, React.ElementType> = {
  User,
  Link2,
  Layers,
  Type,
  Image: ImageIcon,
  Box,
  MapPin,
  Heart,
  Mail,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface BlockTypeIconProps {
  /** Block type — looked up against BIO_BLOCK_CATALOG */
  type: string;
  /** Pixel size of the icon (default 18) */
  size?: number;
  /** Apply opacity / desaturate when used in a "hidden block" context */
  muted?: boolean;
  /** Tailwind class extras (rare; container colour, etc.) */
  className?: string;
}

/**
 * Renders the right kind of icon for a block type:
 *   - Brand blocks (YouTube, Spotify, etc.) → remote SVG from
 *     simpleicons.org with the actual brand colour.
 *   - Layout blocks (Header, Content, Image, etc.) → Lucide icon
 *     using the parent text colour (`currentColor`).
 *
 * If a block type isn't in the catalog (shouldn't happen) we render
 * a small generic Box icon as a fallback.
 */
export function BlockTypeIcon({ type, size = 18, muted, className }: BlockTypeIconProps) {
  const entry = BIO_BLOCK_CATALOG.find((b) => b.type === type);

  if (!entry) {
    return (
      <Box
        width={size}
        height={size}
        className={cn("text-stone-400", muted && "opacity-50", className)}
      />
    );
  }

  // Lucide path — uses the catalog's per-block accent colour so each
  // layout block reads as colourful in the sidebar lists, matching how
  // the brand blocks already render in their own colours.
  if (entry.lucide) {
    const LucideIcon = LUCIDE[entry.lucide];
    return (
      <LucideIcon
        width={size}
        height={size}
        strokeWidth={2.25}
        style={entry.color ? { color: entry.color } : undefined}
        className={cn(muted && "opacity-50 grayscale", className)}
      />
    );
  }

  // Image path — real brand colours from simpleicons.org or local SVG
  return (
    <Image
      src={entry.icon}
      alt={entry.title}
      width={size}
      height={size}
      className={cn(
        "object-contain",
        muted && "opacity-50 grayscale",
        className
      )}
      // simpleicons.org responds with cache-friendly headers; next/image
      // will optimise but we let it pass-through unchanged for SVGs.
      unoptimized
    />
  );
}
