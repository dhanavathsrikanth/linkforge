"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface ContentBlockConfig {
  title?: string;
  content?: string;
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function ContentBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as ContentBlockConfig;
  const { title, content } = config;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      isFrameless
      onDelete={onDelete}
    >
      <div className="py-4 h-full overflow-hidden">
        {title && (
          <h2 className="text-2xl font-medium text-sys-title-primary mb-1">
            {title}
          </h2>
        )}
        {content && (
          <p className="text-lg text-sys-title-secondary">{content}</p>
        )}
        {!title && !content && (
          <p className="text-sys-label-secondary text-sm">
            Edit this block to add content.
          </p>
        )}
      </div>
    </CoreBlock>
  );
}
