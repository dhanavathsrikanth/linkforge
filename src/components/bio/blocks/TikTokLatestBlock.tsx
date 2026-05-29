"use client";

import Link from "next/link";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockData } from "./useBlockData";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { TikTokVideo } from "@/lib/gallery/sync";

function TikTokLogo({ fill = "currentColor" }: { fill?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      fill={fill}
      viewBox="0 0 512 512"
    >
      <path d="M412.19 118.66a109.27 109.27 0 0 1-9.45-5.5 132.87 132.87 0 0 1-24.27-20.62c-18.1-20.71-24.86-41.72-27.35-56.43h.1C349.14 23.9 350 16 350.13 16h-82.44v318.78c0 4.28 0 8.51-.18 12.69 0 .52-.05 1-.08 1.56 0 .23 0 .47-.05.71v.18a70 70 0 0 1-35.22 55.56 68.8 68.8 0 0 1-34.11 9c-38.41 0-69.54-31.32-69.54-70s31.13-70 69.54-70a68.9 68.9 0 0 1 21.41 3.39l.1-83.94a153.14 153.14 0 0 0-118 34.52 161.79 161.79 0 0 0-35.3 43.53c-3.48 6-16.61 30.11-18.2 69.24-1 22.21 5.67 45.22 8.85 54.73v.2c2 5.6 9.75 24.71 22.38 40.82A167.53 167.53 0 0 0 115 470.66v-.2l.2.2c39.91 27.12 84.16 25.34 84.16 25.34 7.66-.31 33.32 0 62.46-13.81 32.32-15.31 50.72-38.12 50.72-38.12a158.46 158.46 0 0 0 27.64-45.93c7.46-19.61 9.95-43.13 9.95-52.53V176.49c1 .6 14.32 9.41 14.32 9.41s19.19 12.3 49.13 20.31c21.48 5.7 50.42 6.9 50.42 6.9v-81.84c-10.14 1.1-30.73-2.1-51.81-12.61Z" />
    </svg>
  );
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function TikTokLatestBlock({ block, isEditable, onDelete }: Props) {
  const { data, loading } = useBlockData<TikTokVideo>(block.id, isEditable);

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      isFrameless
      onDelete={onDelete}
    >
      {loading ? (
        /* Skeleton */
        <div className="w-full h-full min-h-[200px] bg-sys-bg-border rounded-3xl animate-pulse" />
      ) : !data ? (
        /* Not connected */
        <div className="flex items-center justify-center h-full min-h-[200px] bg-sys-bg-secondary rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <TikTokLogo fill="currentColor" />
            <span className="text-sm text-sys-label-secondary text-center px-4">
              {isEditable
                ? "Connect your TikTok account in Integrations to show your latest video."
                : "No video available."}
            </span>
          </div>
        </div>
      ) : data.embedLink ? (
        /* Embed iframe */
        <div className="relative w-full h-full min-h-[200px] rounded-3xl overflow-hidden">
          <iframe
            src={data.embedLink}
            title={data.title || "TikTok video"}
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          {/* TikTok badge */}
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1.5 pointer-events-none">
            <TikTokLogo fill="white" />
          </div>
        </div>
      ) : (
        /* Fallback: cover image + link */
        <Link
          href={`https://www.tiktok.com`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block w-full h-full min-h-[200px] rounded-3xl overflow-hidden group cursor-pointer"
          onClick={isEditable ? (e) => e.preventDefault() : undefined}
        >
          {data.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverImageUrl}
              alt={data.title || "TikTok video"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-sys-bg-secondary flex items-center justify-center">
              <TikTokLogo fill="currentColor" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
          {/* Title + badge */}
          {data.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-xs font-medium line-clamp-2">{data.title}</p>
            </div>
          )}
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
            <TikTokLogo fill="white" />
          </div>
        </Link>
      )}
    </CoreBlock>
  );
}
