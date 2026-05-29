"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BioBlock } from "@/components/bio/BioCanvas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BioEditLayoutMode = "desktop" | "mobile";

export type BioSidebarView =
  | "blocks"
  | "blockForm"
  | "themes";

export interface DraggingItem {
  /** Temporary grid item id while dragging */
  i: string;
  /** Grid columns to span */
  w: number;
  /** Grid rows to span */
  h: number;
  /** Block type being dragged */
  type: string;
}

export interface EditingBlock {
  id: string;
  type: string;
}

interface BioEditContextValue {
  // Drag-to-add
  draggingItem: DraggingItem | null;
  setDraggingItem: (item: DraggingItem | null) => void;
  // Tap-to-add (mobile fallback)
  nextToAddBlock: DraggingItem | null;
  setNextToAddBlock: (item: DraggingItem | null) => void;
  // Currently editing block (opens blockForm view)
  currentEditingBlock: EditingBlock | null;
  setCurrentEditingBlock: (block: EditingBlock | null) => void;
  // Cross-pane hover highlighting — hovering a block on the canvas
  // highlights its row in My Blocks, and vice versa.
  hoveredBlockId: string | null;
  setHoveredBlockId: (id: string | null) => void;
  // Desktop / mobile canvas mode
  editLayoutMode: BioEditLayoutMode;
  setEditLayoutMode: (mode: BioEditLayoutMode) => void;
  // Sidebar view
  sidebarView: BioSidebarView;
  setSidebarView: (view: BioSidebarView) => void;
  // Sidebar open/collapsed
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  // Block list (for the "My Blocks" panel)
  blocks: BioBlock[];
  onBlockVisibilityToggle: (blockId: string) => void;
  onBlockReorder: (fromIndex: number, toIndex: number) => void;
  onBlockDelete: (blockId: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BioEditContext = createContext<BioEditContextValue | undefined>(undefined);

export function useBioEdit(): BioEditContextValue {
  const ctx = useContext(BioEditContext);
  if (!ctx) throw new Error("useBioEdit must be used inside BioEditProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface BioEditProviderProps {
  children: ReactNode;
  blocks: BioBlock[];
  onBlockVisibilityToggle: (blockId: string) => void;
  onBlockReorder: (fromIndex: number, toIndex: number) => void;
  onBlockDelete: (blockId: string) => void;
}

export function BioEditProvider({
  children,
  blocks,
  onBlockVisibilityToggle,
  onBlockReorder,
  onBlockDelete,
}: BioEditProviderProps) {
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const [nextToAddBlock, setNextToAddBlock] = useState<DraggingItem | null>(null);
  const [currentEditingBlock, setCurrentEditingBlock] = useState<EditingBlock | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [editLayoutMode, setEditLayoutMode] = useState<BioEditLayoutMode>("desktop");
  const [sidebarView, setSidebarView] = useState<BioSidebarView>("blocks");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-switch canvas mode based on viewport width.
  // Note: this only fires *once* on mount and on resize. Subsequent
  // user clicks on the Desktop/Mobile toggle take precedence — we
  // don't override their choice when the viewport changes.
  // We use a ref to remember whether the user has manually picked a
  // mode. Once they have, we stop auto-switching.
  const userPickedModeRef = useRef(false);
  useEffect(() => {
    function handleResize() {
      if (userPickedModeRef.current) return;
      // Only auto-pin to mobile preview on very narrow viewports where
      // the 12-column desktop layout would literally not fit. Above
      // 480px we keep desktop preview because that's what visitors see
      // on most phones in landscape and on tablets.
      setEditLayoutMode(window.innerWidth <= 380 ? "mobile" : "desktop");
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <BioEditContext.Provider
      value={{
        draggingItem,
        setDraggingItem,
        nextToAddBlock,
        setNextToAddBlock,
        currentEditingBlock,
        setCurrentEditingBlock,
        hoveredBlockId,
        setHoveredBlockId,
        editLayoutMode,
        // Wrap the setter so we remember when the user manually picked
        // a mode — the auto-resize handler then stops overriding them.
        setEditLayoutMode: (mode: BioEditLayoutMode) => {
          userPickedModeRef.current = true;
          setEditLayoutMode(mode);
        },
        sidebarView,
        setSidebarView,
        sidebarOpen,
        setSidebarOpen,
        blocks,
        onBlockVisibilityToggle,
        onBlockReorder,
        onBlockDelete,
      }}
    >
      {children}
    </BioEditContext.Provider>
  );
}
