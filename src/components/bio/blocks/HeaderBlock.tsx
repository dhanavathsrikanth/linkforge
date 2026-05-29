"use client";

import { cn } from "@/lib/utils";
import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface HeaderBlockConfig {
  title?: string;
  description?: string;
  avatar?: { src: string };
  showVerifiedBadge?: boolean;
  alignment?: "left" | "center" | "right";
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function HeaderBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as HeaderBlockConfig;
  const { title, description, avatar, alignment = "left" } = config;

  const alignClass =
    alignment === "center"
      ? "items-center text-center"
      : alignment === "right"
      ? "items-end text-right"
      : "items-start text-left";

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      isFrameless
      onDelete={onDelete}
    >
      <header className={cn("py-4 flex flex-col", alignClass)}>
        {avatar?.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar.src}
            alt={title ?? "Profile avatar"}
            className="mb-6 w-20 h-20 rounded-lg object-cover"
          />
        )}
        <h1 className="font-bold text-4xl mb-1 text-sys-title-primary">
          {title || "Hello World"}
        </h1>
        <p className="text-2xl text-sys-title-secondary">
          {description || "Welcome to your new page"}
        </p>
      </header>
    </CoreBlock>
  );
}
