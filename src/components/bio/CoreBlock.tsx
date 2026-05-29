"use client";

import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useBioEdit } from "@/contexts/BioEditContext";
import { ConfirmDialog } from "@/components/bio/ConfirmDialog";
import { BIO_BLOCK_CATALOG } from "@/components/bio/blockCatalog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoreBlockProps {
  blockId: string;
  blockType: string;
  isEditable: boolean;
  children: ReactNode;
  className?: string;
  /** When set and not in edit mode, the whole block becomes a link */
  href?: string;
  /** Remove the card frame (bg, border, shadow) — used for header block */
  isFrameless?: boolean;
  onDelete?: (blockId: string) => void;
  /** Optional click capture handler — used for analytics tracking */
  onClickCapture?: () => void;
}

// ─── Edit toolbar overlay ─────────────────────────────────────────────────────

function EditToolbar({
  blockId,
  blockType,
  onDelete,
}: {
  blockId: string;
  blockType: string;
  onDelete?: (id: string) => void;
}) {
  const { setCurrentEditingBlock, setSidebarView, setSidebarOpen } = useBioEdit();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleEdit() {
    setCurrentEditingBlock({ id: blockId, type: blockType });
    setSidebarView("blockForm");
    setSidebarOpen(true);
  }

  function requestDelete() {
    setConfirmOpen(true);
  }

  function confirmDelete() {
    onDelete?.(blockId);
    setConfirmOpen(false);
  }

  const blockTitle =
    BIO_BLOCK_CATALOG.find((b) => b.type === blockType)?.title ?? blockType;

  return (
    <>
      <span className="isolate inline-flex rounded-full shadow-md z-40 absolute top-2 right-2 block-toolbar opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          type="button"
          onClick={handleEdit}
          className="relative inline-flex items-center rounded-l-full bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-stone-100 focus:z-10 cursor-pointer"
          aria-label="Edit block"
        >
          <Pencil className="w-3.5 h-3.5 text-slate-700" />
        </button>
        <button
          type="button"
          onClick={requestDelete}
          className="relative -ml-px inline-flex items-center rounded-r-full bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-stone-100 hover:text-rose-600 focus:z-10 cursor-pointer"
          aria-label="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-700" />
        </button>
      </span>

      {/* Reuse the same in-app modal pattern as the My Blocks list. */}
      <ConfirmDialog
        open={confirmOpen}
        title={`Remove "${blockTitle}"?`}
        description="This block and its content will be removed from your page. You can always add it back from the Add tab."
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

// ─── CoreBlock ────────────────────────────────────────────────────────────────

export function CoreBlock({
  blockId,
  blockType,
  isEditable,
  children,
  className,
  href,
  isFrameless = false,
  onDelete,
  onClickCapture,
}: CoreBlockProps) {
  const classes = cn(
    "h-full overflow-hidden relative max-w-full group",
    !isFrameless && [
      "bg-[hsl(var(--sys-bg-primary))]",
      "border border-[hsl(var(--sys-bg-border))]",
      "p-6 rounded-3xl shadow-md",
    ],
    className
  );

  const content = (
    <>
      {children}
      {isEditable && blockType !== "default" && (
        <EditToolbar blockId={blockId} blockType={blockType} onDelete={onDelete} />
      )}
    </>
  );

  // In view mode, if href is provided, wrap in a link
  if (href && !isEditable) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        onClickCapture={onClickCapture}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} onClickCapture={onClickCapture}>
      {content}
    </div>
  );
}
