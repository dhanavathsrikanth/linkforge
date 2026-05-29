"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockClick } from "./useBlockClick";
import { cn } from "@/lib/utils";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { LinksBlockConfig, LinksBlockItem } from "@/components/bio/forms/LinksForm";

// ─── Block ────────────────────────────────────────────────────────────────────
//
// Renders a vertical list of links inside a single CoreBlock card.
// Distinguished from `LinkBoxBlock` (one big card per link) and
// `LinkBarBlock` (horizontal row of icon-only buttons): here each link
// is a borderless row in the same card, separated only by a thin divider.

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

interface LinkRowProps {
  blockId: string;
  isEditable: boolean;
  item: LinksBlockItem;
  isLast: boolean;
}

function LinkRow({ blockId, isEditable, item, isLast }: LinkRowProps) {
  const trackClick = useBlockClick(blockId, isEditable, {
    url: item.url,
    title: item.title,
  });

  const Wrapper: React.ElementType = isEditable ? "div" : "a";

  return (
    <Wrapper
      {...(!isEditable
        ? { href: item.url, target: "_blank", rel: "noopener noreferrer" }
        : {})}
      onClick={isEditable ? undefined : trackClick}
      className={cn(
        "group/row flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl transition-colors",
        !isLast && "border-b border-sys-bg-border",
        !isEditable && "hover:bg-sys-bg-secondary cursor-pointer"
      )}
    >
      {/* Icon — brand glyph in tinted square */}
      <div className="w-9 h-9 rounded-lg bg-sys-bg-secondary flex items-center justify-center shrink-0 overflow-hidden p-1.5">
        {item.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.iconUrl}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <ExternalLink className="w-4 h-4 text-sys-label-secondary" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-sys-label-primary truncate leading-tight">
          {item.title || "Untitled link"}
        </p>
        {item.subtitle ? (
          <p className="text-xs text-sys-label-secondary truncate mt-0.5">
            {item.subtitle}
          </p>
        ) : null}
      </div>

      {/* Affordance — only meaningful in view mode */}
      {!isEditable && (
        <ChevronRight className="w-4 h-4 text-sys-label-secondary shrink-0 transition-transform group-hover/row:translate-x-0.5" />
      )}
    </Wrapper>
  );
}

export function LinksBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as LinksBlockConfig;
  const { title, subtitle, items = [] } = config;

  // Hide hidden items on the public page; in the editor we still
  // render them at half-opacity so the owner sees what's been authored.
  const visibleItems = isEditable ? items : items.filter((i) => i.visible !== false);

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      onDelete={onDelete}
      className="flex flex-col"
    >
      {(title || subtitle) && (
        <header className="mb-2">
          {title && (
            <h2 className="text-base font-semibold text-sys-title-primary leading-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-sys-label-secondary mt-0.5">{subtitle}</p>
          )}
        </header>
      )}

      {visibleItems.length === 0 ? (
        <p className="text-sm text-sys-label-secondary py-4 text-center">
          {isEditable
            ? "Edit this block to add your first link."
            : "No links yet."}
        </p>
      ) : (
        <div className="flex flex-col">
          {visibleItems.map((item, i) => (
            <div
              key={item.id}
              className={cn(isEditable && item.visible === false && "opacity-50")}
            >
              <LinkRow
                blockId={block.id}
                isEditable={isEditable}
                item={item}
                isLast={i === visibleItems.length - 1}
              />
            </div>
          ))}
        </div>
      )}
    </CoreBlock>
  );
}
