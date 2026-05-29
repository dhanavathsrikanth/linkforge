"use client";

import Link from "next/link";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockData } from "./useBlockData";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { InstagramPost } from "@/lib/gallery/sync";

function InstagramLogo({ stroke = "currentColor" }: { stroke?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/** Play icon overlay for video posts */
function PlayIcon() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </div>
    </div>
  );
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function InstagramLatestBlock({ block, isEditable, onDelete }: Props) {
  const { data, loading } = useBlockData<InstagramPost[]>(block.id, isEditable);

  // Determine how many posts to show from block config (default 1)
  const config = block.config as Record<string, unknown> | undefined;
  const numberOfPosts = typeof config?.numberOfPosts === "number" ? config.numberOfPosts : 1;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      className="!p-0 overflow-hidden"
      onDelete={onDelete}
    >
      {loading ? (
        /* Skeleton */
        <div
          className={`grid gap-0.5 w-full h-full min-h-[160px] ${
            numberOfPosts > 1 ? "grid-cols-3" : "grid-cols-1"
          }`}
        >
          {Array.from({ length: numberOfPosts }).map((_, i) => (
            <div key={i} className="bg-sys-bg-border animate-pulse aspect-square" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        /* Not connected / no posts */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sys-bg-secondary rounded-3xl">
          <InstagramLogo />
          <span className="text-sm text-sys-label-secondary text-center px-4">
            {isEditable
              ? "Connect your Instagram account in Integrations to show your latest post."
              : "No posts available."}
          </span>
        </div>
      ) : (
        /* Live data — post grid */
        <div
          className={`grid gap-0.5 w-full h-full ${
            data.length > 1 ? "grid-cols-3" : "grid-cols-1"
          }`}
        >
          {data.map((post) => (
            <Link
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block aspect-square overflow-hidden group cursor-pointer"
              onClick={isEditable ? (e) => e.preventDefault() : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt={post.caption ?? "Instagram post"}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Video indicator */}
              {(post.mediaType === "VIDEO" || post.mediaType === "CAROUSEL_ALBUM") && (
                <PlayIcon />
              )}
              {/* Caption overlay on hover */}
              {post.caption && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                  <p className="text-white text-[10px] line-clamp-3 leading-tight">
                    {post.caption}
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Instagram logo badge */}
      {!loading && (
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full p-1.5">
          <InstagramLogo stroke="white" />
        </div>
      )}
    </CoreBlock>
  );
}
