"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockData } from "./useBlockData";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { InstagramFollowerData } from "@/lib/gallery/sync";

function InstagramLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-sys-label-primary"
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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function InstagramFollowersBlock({ block, isEditable, onDelete }: Props) {
  const { data, loading } = useBlockData<InstagramFollowerData>(block.id, isEditable);

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      onDelete={onDelete}
    >
      {loading ? (
        /* Skeleton */
        <div className="flex flex-col justify-between h-full min-h-[120px]">
          <div className="flex flex-col gap-2">
            <div className="h-2.5 w-36 bg-sys-bg-border rounded animate-pulse" />
            <div className="h-9 w-24 bg-sys-bg-border rounded animate-pulse mt-1" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-7 h-7 rounded-full bg-sys-bg-border animate-pulse" />
            <div className="h-2.5 w-28 bg-sys-bg-border rounded animate-pulse" />
          </div>
        </div>
      ) : !data ? (
        /* Not connected */
        <div className="flex flex-col justify-between h-full min-h-[120px]">
          <div className="flex flex-col gap-2">
            <span className="uppercase font-bold text-xs tracking-wider text-sys-label-secondary">
              Instagram Followers
            </span>
            <span className="text-sys-label-primary text-4xl font-medium">—</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-sys-label-secondary">
              {isEditable ? "Connect Instagram in Integrations" : "Not connected"}
            </span>
            <InstagramLogo />
          </div>
        </div>
      ) : (
        /* Live data */
        <div className="flex flex-col justify-between h-full min-h-[120px]">
          <div className="flex flex-col gap-1">
            <span className="uppercase font-bold text-xs tracking-wider text-sys-label-secondary">
              Instagram Followers
            </span>
            <span className="text-sys-label-primary text-4xl font-semibold tabular-nums">
              {formatCount(data.followerCount)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 min-w-0">
              {data.profile.profilePictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.profile.profilePictureUrl}
                  alt={data.profile.username}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-sys-bg-border shrink-0" />
              )}
              <span className="text-xs text-sys-label-secondary truncate">
                @{data.profile.username}
              </span>
            </div>
            <InstagramLogo />
          </div>
        </div>
      )}
    </CoreBlock>
  );
}
