"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useBioEdit } from "@/contexts/BioEditContext";
import { BlockTypeIcon } from "@/components/bio/BlockTypeIcon";
import type { BlockCatalogEntry } from "@/components/bio/blockCatalog";

interface DraggableBlockButtonProps {
  block: BlockCatalogEntry;
}

export function DraggableBlockButton({ block }: DraggableBlockButtonProps) {
  const { setDraggingItem, setNextToAddBlock, editLayoutMode } = useBioEdit();

  const dragPayload = {
    i: "tmp-block",
    w: block.drag.w,
    h: block.drag.h,
    type: block.type,
  };

  // ─── Shared inner content ─────────────────────────────────────────────────
  const content = (
    <>
      {/* Drag handle — desktop only */}
      <Image
        src="/block-icons/drag.svg"
        width={9}
        height={15}
        alt=""
        className="mr-2 shrink-0 hidden md:block opacity-40"
      />

      {/* Block type icon — brand icons render in their real colours,
          layout-style icons render with a per-block accent so each
          block reads as visually distinct. The container tints subtly
          to match the icon's hue. */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 shrink-0 overflow-hidden"
        style={
          block.color
            ? { backgroundColor: `${block.color}1A` /* ~10% alpha */ }
            : { backgroundColor: "rgb(245 245 244)" /* stone-100 */ }
        }
      >
        <BlockTypeIcon type={block.type} size={20} />
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-stone-900 text-sm leading-tight truncate">
          {block.title}
        </span>
        <span className="text-xs text-stone-500 truncate">{block.label}</span>
      </div>
    </>
  );

  // ─── Desktop: draggable ───────────────────────────────────────────────────
  if (editLayoutMode === "desktop") {
    return (
      <button
        type="button"
        draggable
        unselectable="on"
        onDragStart={(e) => {
          // Required for Firefox drag-and-drop
          e.dataTransfer.setData("text/plain", "");
          setDraggingItem(dragPayload);
        }}
        onDragEnd={() => {
          // Clean up if dropped outside the grid
          setTimeout(() => setDraggingItem(null), 100);
        }}
        className="flex w-full items-center text-left px-3 py-2.5 bg-white border border-stone-200 rounded-xl shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-move select-none"
      >
        {content}
      </button>
    );
  }

  // ─── Mobile: tap to add ───────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={() => setNextToAddBlock(dragPayload)}
      className="flex w-full items-center text-left px-3 py-2.5 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
    >
      {content}
      <Plus className="w-4 h-4 text-stone-400 ml-auto shrink-0" />
    </button>
  );
}
