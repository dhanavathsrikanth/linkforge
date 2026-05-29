"use client";

import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface StackItem {
  title: string;
  label?: string;
  link?: string;
  icon: { src: string };
}

interface StackBlockConfig {
  title?: string;
  label?: string;
  items?: StackItem[];
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function StackBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as StackBlockConfig;
  const { title, label, items = [] } = config;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      onDelete={onDelete}
    >
      {title && (
        <h2 className="text-2xl font-medium text-sys-label-primary mb-1">
          {title}
        </h2>
      )}
      {label && (
        <p className="text-md text-sys-label-secondary">{label}</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-sys-label-secondary mt-4">
          Edit this block to add items.
        </p>
      ) : (
        <div className="flex flex-col gap-6 mt-6">
          {items.map((item, i) => {
            const Wrapper = item.link && !isEditable ? "a" : "div";
            return (
              <Wrapper
                key={i}
                {...(item.link && !isEditable
                  ? { href: item.link, target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="flex items-center gap-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.icon.src}
                  alt=""
                  className="w-10 h-10 rounded-md flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <h3 className="font-medium text-sys-label-primary text-lg mb-0 truncate">
                    {item.title}
                  </h3>
                  {item.label && (
                    <p className="text-sys-label-secondary -mt-1 truncate">
                      {item.label}
                    </p>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </CoreBlock>
  );
}
