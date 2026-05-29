"use client";

import Link from "next/link";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockData } from "./useBlockData";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { SpotifyNowPlayingData } from "@/lib/gallery/sync";

function SpotifyLogo() {
  return (
    <svg width={20} height={20} viewBox="0 0 496 512" className="absolute right-4 bottom-4 opacity-80">
      <path fill="#1ed760" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z" />
      <path d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" />
    </svg>
  );
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function SpotifyPlayingBlock({ block, isEditable, onDelete }: Props) {
  const { data, loading } = useBlockData<SpotifyNowPlayingData>(block.id, isEditable);

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      className="bg-gradient-to-tr from-[#0A0B0D] to-[#402650]"
      onDelete={onDelete}
    >
      {loading ? (
        /* Skeleton */
        <div className="flex gap-3 items-center">
          <div className="w-16 h-16 rounded-xl bg-white/10 animate-pulse shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      ) : !data ? (
        /* Not connected */
        <div className="flex items-center justify-center h-full min-h-[80px]">
          <span className="text-sm text-white/60 text-center">
            {isEditable
              ? "Connect Spotify in Integrations to show what you're listening to."
              : "Nothing playing right now."}
          </span>
        </div>
      ) : (
        /* Live data */
        <Link
          href={data.hyperlink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 items-center cursor-pointer"
          onClick={isEditable ? (e) => e.preventDefault() : undefined}
        >
          {/* Album art */}
          {data.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={data.albumName}
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
          )}
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">
              {data.isPlayingNow ? "▶ Playing Now" : "Recently Played"}
            </p>
            <p className="text-sm text-white font-bold truncate">{data.name}</p>
            <p className="text-xs text-white/70 truncate">{data.artistName}</p>
          </div>
        </Link>
      )}
      <SpotifyLogo />
    </CoreBlock>
  );
}
