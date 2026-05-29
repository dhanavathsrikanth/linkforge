"use client";

import { Search, Eye, EyeOff, GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { DraggableBlockButton } from "@/components/bio/DraggableBlockButton";
import { BIO_BLOCK_CATALOG } from "@/components/bio/blockCatalog";
import { BlockTypeIcon } from "@/components/bio/BlockTypeIcon";
import { ConfirmDialog } from "@/components/bio/ConfirmDialog";
import { useBioEdit } from "@/contexts/BioEditContext";
import { cn } from "@/lib/utils";

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "add" | "manage";

// ─── Block type → title lookup ───────────────────────────────────────────────

function getBlockTitle(type: string): string {
  return BIO_BLOCK_CATALOG.find((b) => b.type === type)?.title ?? type;
}

// ─── Drag-to-reorder state ────────────────────────────────────────────────────

interface DragState {
  dragIndex: number;
  overIndex: number;
}

// ─── Single block row in "My Blocks" ─────────────────────────────────────────

function BlockRow({
  blockId,
  blockType,
  visible,
  isDragging,
  isOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onRequestDelete,
}: {
  blockId: string;
  blockType: string;
  visible: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  /** Open the in-app confirmation dialog for this block */
  onRequestDelete: (blockId: string, blockType: string) => void;
}) {
  const {
    onBlockVisibilityToggle,
    setCurrentEditingBlock,
    setSidebarView,
    setSidebarOpen,
    hoveredBlockId,
    setHoveredBlockId,
  } = useBioEdit();

  const isHovered = hoveredBlockId === blockId;

  function handleEdit() {
    setCurrentEditingBlock({ id: blockId, type: blockType });
    setSidebarView("blockForm");
    setSidebarOpen(true);
  }

  function handleDelete() {
    onRequestDelete(blockId, blockType);
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onMouseEnter={() => setHoveredBlockId(blockId)}
      onMouseLeave={() => {
        if (hoveredBlockId === blockId) setHoveredBlockId(null);
      }}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-xl border transition-all select-none",
        isDragging
          ? "opacity-40 border-primary/30 bg-primary/5"
          : isOver
          ? "border-primary bg-primary/5 shadow-sm"
          : isHovered
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-stone-200 bg-white hover:border-stone-300",
        !visible && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 shrink-0 touch-none">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Block icon — tinted container matches the per-block accent
          so each row reads at a glance, just like the Add tab. */}
      {(() => {
        const meta = BIO_BLOCK_CATALOG.find((b) => b.type === blockType);
        const tint = visible && meta?.color ? `${meta.color}1A` : "rgb(245 245 244)";
        return (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: tint }}
          >
            <BlockTypeIcon type={blockType} size={16} muted={!visible} />
          </div>
        );
      })()}

      {/* Block name */}
      <span
        className={cn(
          "flex-1 text-xs font-medium truncate",
          visible ? "text-stone-800" : "text-stone-400 line-through"
        )}
      >
        {getBlockTitle(blockType)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Edit */}
        <button
          type="button"
          onClick={handleEdit}
          className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer touch-manipulation"
          title="Edit block"
          aria-label="Edit block"
        >
          <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
        </button>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => onBlockVisibilityToggle(blockId)}
          className={cn(
            "w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer touch-manipulation",
            visible
              ? "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              : "text-primary bg-primary/10 hover:bg-primary/20"
          )}
          title={visible ? "Hide block" : "Show block"}
          aria-label={visible ? "Hide block" : "Show block"}
        >
          {visible ? <Eye className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> : <EyeOff className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer touch-manipulation"
          title="Remove block"
          aria-label="Remove block"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── SidebarBlocks ────────────────────────────────────────────────────────────

export function SidebarBlocks() {
  const [tab, setTab] = useState<Tab>("add");
  const [search, setSearch] = useState("");
  const { blocks, onBlockReorder, onBlockDelete } = useBioEdit();

  // Drag-to-reorder state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragIndexRef = useRef<number>(-1);

  // In-app delete confirmation. Replaces the disruptive `window.confirm`
  // popup with a centred modal that integrates with the editor's design.
  const [pendingDelete, setPendingDelete] = useState<{ id: string; type: string } | null>(null);

  function requestDelete(id: string, type: string) {
    setPendingDelete({ id, type });
  }
  function confirmDelete() {
    if (!pendingDelete) return;
    onBlockDelete(pendingDelete.id);
    setPendingDelete(null);
  }
  function cancelDelete() {
    setPendingDelete(null);
  }

  // Human-readable name for the dialog (matches My Blocks list).
  const pendingTitle = pendingDelete
    ? BIO_BLOCK_CATALOG.find((b) => b.type === pendingDelete.type)?.title ?? pendingDelete.type
    : "";

  // ── Catalog filter ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return BIO_BLOCK_CATALOG;
    const q = search.toLowerCase();
    return BIO_BLOCK_CATALOG.filter(
      (b) =>
        b.type.includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.label.toLowerCase().includes(q)
    );
  }, [search]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function handleDragStart(index: number) {
    dragIndexRef.current = index;
    setDragState({ dragIndex: index, overIndex: index });
  }

  function handleDragEnter(index: number) {
    if (dragIndexRef.current === -1) return;
    setDragState((prev) =>
      prev ? { ...prev, overIndex: index } : null
    );
  }

  function handleDragEnd() {
    if (dragState && dragState.dragIndex !== dragState.overIndex) {
      onBlockReorder(dragState.dragIndex, dragState.overIndex);
    }
    dragIndexRef.current = -1;
    setDragState(null);
  }

  const visibleCount = blocks.filter((b) => b.visible).length;
  const hiddenCount = blocks.length - visibleCount;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Blocks</h2>

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("add")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "add"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setTab("manage")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              tab === "manage"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            My Blocks
            {blocks.length > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                  tab === "manage"
                    ? "bg-primary/10 text-primary"
                    : "bg-stone-200 text-stone-500"
                )}
              >
                {blocks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── ADD TAB ──────────────────────────────────────────────────────── */}
      {tab === "add" && (
        <>
          {/* Search */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter blocks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Block catalog */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {filtered.map((block) => (
              <DraggableBlockButton key={block.type} block={block} />
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-8">
                No blocks match &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </>
      )}

      {/* ── MANAGE TAB ───────────────────────────────────────────────────── */}
      {tab === "manage" && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-stone-300" />
              </div>
              <p className="text-sm font-medium text-stone-600 mb-1">No blocks yet</p>
              <p className="text-xs text-stone-400">
                Switch to the Add tab to add your first block.
              </p>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-800">{visibleCount}</span> visible
                </span>
                {hiddenCount > 0 && (
                  <span className="text-xs text-stone-400">
                    · {hiddenCount} hidden
                  </span>
                )}
                <span className="text-xs text-stone-400 ml-auto">Drag to reorder</span>
              </div>

              {/* Block list */}
              <div className="space-y-1.5">
                {blocks.map((block, index) => (
                  <BlockRow
                    key={block.id}
                    blockId={block.id}
                    blockType={block.type}
                    visible={block.visible}
                    isDragging={dragState?.dragIndex === index}
                    isOver={
                      dragState !== null &&
                      dragState.overIndex === index &&
                      dragState.dragIndex !== index
                    }
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onRequestDelete={requestDelete}
                  />
                ))}
              </div>

              {/* Hint */}
              <p className="text-[11px] text-stone-400 text-center mt-4">
                Hidden blocks are saved but not shown on your public page.
              </p>
            </>
          )}
        </div>
      )}

      {/* In-app delete confirmation — replaces window.confirm() */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Remove "${pendingTitle}"?`}
        description="This block and its content will be removed from your page. You can always add it back from the Add tab."
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
