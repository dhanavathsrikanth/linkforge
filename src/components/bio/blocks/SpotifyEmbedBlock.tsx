"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface SpotifyEmbedBlockConfig {
  embedUrl?: string;
  type?: "track" | "playlist" | "album";
}

/** Convert a Spotify share URL to an embed URL */
function toEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    // Already an embed URL
    if (url.includes("open.spotify.com/embed")) return url;
    // Convert open.spotify.com/track/ID → open.spotify.com/embed/track/ID
    const parsed = new URL(url);
    const path = parsed.pathname; // e.g. /track/4iV5W9uYEdYUVa79Axb7Rh
    return `https://open.spotify.com/embed${path}?utm_source=generator`;
  } catch {
    return null;
  }
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function SpotifyEmbedBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as SpotifyEmbedBlockConfig;
  const embedUrl = toEmbedUrl(config.embedUrl);

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      isFrameless
      className="flex flex-col"
      onDelete={onDelete}
    >
      {embedUrl ? (
        <div className={isEditable ? "pointer-events-none w-full h-full" : "w-full h-full"}>
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-3xl"
            title="Spotify Embed"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full min-h-[80px]">
          <span className="text-sm text-sys-label-secondary text-center">
            Edit this block to add a Spotify track or playlist.
          </span>
        </div>
      )}
    </CoreBlock>
  );
}
