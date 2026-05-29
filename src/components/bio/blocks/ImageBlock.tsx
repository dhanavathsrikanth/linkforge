"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface ImageBlockConfig {
  src?: string;
  alt?: string;
  caption?: string;
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function ImageBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as ImageBlockConfig;
  const { src, alt, caption } = config;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      className="relative !p-0 overflow-hidden"
      onDelete={onDelete}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-sys-bg-secondary">
          <span className="text-sm text-sys-label-secondary">
            Edit this block to add an image.
          </span>
        </div>
      )}
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-xs">{caption}</p>
        </div>
      )}
    </CoreBlock>
  );
}
