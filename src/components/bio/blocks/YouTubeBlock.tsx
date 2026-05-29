"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface YouTubeBlockConfig {
  videoId?: string;
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function YouTubeBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as YouTubeBlockConfig;
  const { videoId } = config;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      isFrameless
      className="flex flex-col"
      onDelete={onDelete}
    >
      {videoId ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          allowFullScreen
          title="YouTube video player"
          frameBorder={0}
          height="100%"
          className="rounded-3xl w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="flex items-center justify-center h-full min-h-[120px]">
          <span className="text-sm text-sys-label-secondary text-center">
            Edit this block to add a YouTube video.
          </span>
        </div>
      )}
    </CoreBlock>
  );
}
