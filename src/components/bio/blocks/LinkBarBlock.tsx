"use client";

import { ExternalLink } from "lucide-react";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockClick } from "./useBlockClick";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface LinkBarLink {
  link: string;
  icon?: { src: string };
  label?: string;
}

interface LinkBarBlockConfig {
  links?: LinkBarLink[];
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

// ─── Single tracked link ──────────────────────────────────────────────────────

function TrackedLink({
  blockId,
  isEditable,
  link,
}: {
  blockId: string;
  isEditable: boolean;
  link: LinkBarLink;
}) {
  const trackClick = useBlockClick(blockId, isEditable, {
    url: link.link,
    label: link.label ?? "",
  });

  return (
    <a
      href={isEditable ? undefined : link.link}
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer"
      onClick={(e) => {
        if (isEditable) {
          e.preventDefault();
          return;
        }
        trackClick();
      }}
    >
      {link.icon?.src ? (
        // Wrap brand glyphs in a padded container so icons that bleed
        // to their viewBox edges (LinkedIn's "in", Threads, etc.) don't
        // get clipped by rounded corners. The img sits inside with
        // `object-contain` so each glyph keeps its natural proportions.
        // eslint-disable-next-line @next/next/no-img-element
        <div className="w-10 h-10 rounded-md flex items-center justify-center p-1.5 bg-white/0">
          <img
            src={link.icon.src}
            className="w-full h-full object-contain"
            alt={link.label ?? ""}
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-md bg-sys-bg-secondary flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-sys-label-secondary" />
        </div>
      )}
    </a>
  );
}

// ─── LinkBarBlock ─────────────────────────────────────────────────────────────

export function LinkBarBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as LinkBarBlockConfig;
  const links = config.links ?? [];

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      isFrameless
      className="items-center flex"
      onDelete={onDelete}
    >
      <div className="flex flex-row gap-4 items-center justify-center w-full py-2">
        {links.length === 0 ? (
          <span className="text-sm text-sys-label-secondary">
            Add social links in the editor
          </span>
        ) : (
          links.map((link, i) => (
            <TrackedLink
              key={i}
              blockId={block.id}
              isEditable={isEditable}
              link={link}
            />
          ))
        )}
      </div>
    </CoreBlock>
  );
}
