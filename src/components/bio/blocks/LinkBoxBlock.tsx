"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockClick } from "./useBlockClick";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface LinkBoxBlockConfig {
  title?: string;
  label?: string;
  icon?: { src: string };
  link?: string;
  showPreview?: boolean;
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function LinkBoxBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as LinkBoxBlockConfig;
  const { title, label, icon, link, showPreview } = config;

  const trackClick = useBlockClick(block.id, isEditable, {
    url: link ?? "",
    title: title ?? "",
  });

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      href={link}
      className="items-center flex group cursor-pointer"
      onDelete={onDelete}
      onClickCapture={trackClick}
    >
      {showPreview && link ? (
        /* Preview mode — full-bleed screenshot */
        <div className="flex flex-row gap-4 items-center relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://shots.lin.ky/take?url=${link}`}
            className="w-full h-full object-cover"
            alt={`Preview of ${link}`}
          />
          <div className="absolute bottom-0 left-0 w-full h-auto py-8 bg-gradient-to-b from-transparent to-black/80 px-4 z-[2] flex flex-row items-center gap-4">
            {icon?.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon.src} className="w-10 h-10 rounded-md" alt="Link icon" />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-base text-white">{title}</span>
              {label && <span className="text-white text-xs">{label}</span>}
            </div>
          </div>
        </div>
      ) : (
        /* Standard mode */
        <div className="flex flex-row gap-4 items-center w-full">
          {icon?.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon.src} className="w-10 h-10 rounded-md flex-shrink-0" alt="Link icon" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-base text-sys-label-primary truncate">
              {title || "New Link"}
            </span>
            {label && (
              <span className="text-sys-label-secondary text-xs truncate">{label}</span>
            )}
          </div>
        </div>
      )}
    </CoreBlock>
  );
}
