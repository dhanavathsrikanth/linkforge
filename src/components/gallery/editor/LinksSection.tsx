"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, Plus, Link2 } from "lucide-react";
import type { GalleryLink } from "@/types/gallery";
import { nanoid } from "nanoid";

// ─── Emoji picker (simple inline grid) ────────────────────────────────────────
const EMOJIS = [
  "🔗","🌐","📱","💼","🎨","🎵","🎬","📸","✍️","💡","🚀","⭐","❤️","🔥","💎",
  "🌟","📩","🛒","🎙️","🎤","📝","🤝","🌍","💻","📊","🎯","🏆","💰","🧠","⚡",
];

interface EmojiPickerProps {
  value?: string;
  onSelect: (emoji: string) => void;
  onClear: () => void;
}

function EmojiPicker({ value, onSelect, onClear }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-base transition-colors"
      >
        {value || "＋"}
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-50 bg-popover border border-border rounded-xl p-2 shadow-xl w-52">
          <div className="grid grid-cols-6 gap-1">
            <button
              className="col-span-6 text-xs text-muted-foreground hover:text-foreground py-1 text-left px-1 border-b border-border mb-1"
              onClick={() => { onClear(); setOpen(false); }}
            >
              Clear emoji
            </button>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onSelect(e); setOpen(false); }}
                className="h-8 flex items-center justify-center rounded hover:bg-muted text-lg transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sortable link card ────────────────────────────────────────────────────────

interface SortableLinkCardProps {
  link: GalleryLink;
  onUpdate: (patch: Partial<GalleryLink>) => void;
  onDelete: () => void;
}

function SortableLinkCard({ link, onUpdate, onDelete }: SortableLinkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-xl border bg-card p-3 transition-all ${
        isDragging ? "shadow-2xl scale-[1.02] border-primary/40" : "border-border hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Emoji */}
        <EmojiPicker
          value={link.emoji}
          onSelect={(e) => onUpdate({ emoji: e })}
          onClear={() => onUpdate({ emoji: undefined })}
        />

        {/* Title */}
        <input
          type="text"
          value={link.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Button label"
          className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/40 font-medium"
        />

        {/* Visibility toggle */}
        <button
          onClick={() => onUpdate({ visible: !link.visible })}
          className={`p-1.5 rounded-lg transition-colors ${
            link.visible
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/40 hover:bg-muted"
          }`}
          title={link.visible ? "Hide link" : "Show link"}
        >
          {link.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete link"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 pl-6">
        <Link2 className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <input
          type="url"
          value={link.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://..."
          className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/30 text-muted-foreground font-mono"
        />
      </div>
    </div>
  );
}

// ─── Links section ─────────────────────────────────────────────────────────────

// P4: Hard cap — API also enforces this
const MAX_LINKS = 30;

interface LinksSectionProps {
  links: GalleryLink[];
  onUpdate: (links: GalleryLink[]) => void;
}

export function LinksSection({ links, onUpdate }: LinksSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = links.findIndex((l) => l.id === active.id);
      const newIndex = links.findIndex((l) => l.id === over.id);
      onUpdate(arrayMove(links, oldIndex, newIndex));
    }
  }

  function addLink() {
    if (links.length >= MAX_LINKS) return;
    const newLink: GalleryLink = {
      id: nanoid(8),
      title: "",
      url: "",
      visible: true,
    };
    onUpdate([...links, newLink]);
  }

  function updateLink(id: string, patch: Partial<GalleryLink>) {
    onUpdate(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function deleteLink(id: string) {
    onUpdate(links.filter((l) => l.id !== id));
  }

  const atCap = links.length >= MAX_LINKS;

  return (
    <div className="space-y-3">
      {links.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-xl">
          <Link2 className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No links yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Add your first link below</p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {links.map((link) => (
            <SortableLinkCard
              key={link.id}
              link={link}
              onUpdate={(patch) => updateLink(link.id, patch)}
              onDelete={() => deleteLink(link.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* P4: Cap indicator + disabled state at 30 */}
      <div className="flex items-center gap-2">
        <button
          onClick={addLink}
          disabled={atCap}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all ${
            atCap
              ? "border-border/40 text-muted-foreground/30 cursor-not-allowed"
              : "border-primary/30 text-primary/80 hover:bg-primary/5 hover:border-primary/50"
          }`}
        >
          <Plus className="w-4 h-4" />
          Add link
        </button>
        <span className={`text-xs tabular-nums shrink-0 ${atCap ? "text-destructive" : "text-muted-foreground/50"}`}>
          {links.length}/{MAX_LINKS}
        </span>
      </div>
      {atCap && (
        <p className="text-xs text-destructive/80 text-center">
          Maximum 30 links reached. Delete a link to add more.
        </p>
      )}
    </div>
  );
}
