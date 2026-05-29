"use client";

import { useMemo, useRef, useState } from "react";
import {
  Plus,
  GripVertical,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Wand2,
  ExternalLink,
} from "lucide-react";
import { Field, TextInput, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";
import { BRAND_ICONS, iconUrl, type BrandIcon } from "./icons";
import { IconGallery } from "./IconGallery";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single row in the Links block.
 *
 * Distinct from `LinkBoxBlock` (one row = one card) and `LinkBarBlock`
 * (icon-only row): rows here render side-by-side title + subtitle inside
 * a shared parent card with thin separators.
 */
export interface LinksBlockItem {
  id: string;
  /** Display title — can differ from the URL (e.g. "Read my blog") */
  title: string;
  /** Optional secondary line, e.g. "blog.example.com" */
  subtitle?: string;
  /** Destination URL */
  url: string;
  /** Brand icon URL (CDN or inline SVG data URL). Empty = generic glyph. */
  iconUrl?: string;
  /** When false the row is hidden on the public page but kept in config. */
  visible?: boolean;
}

export interface LinksBlockConfig {
  title?: string;
  subtitle?: string;
  items: LinksBlockItem[];
}

// ─── URL → brand auto-detection ───────────────────────────────────────────────

// We match by hostname → simpleicons slug. Because the BRAND_ICONS list
// uses slugs like `linkedin`, `youtube`, `x`, etc., we keep a small
// override map for hostnames that don't match the slug 1:1
// (twitter.com → x, t.co → x, ...).
const HOSTNAME_OVERRIDES: Record<string, string> = {
  "twitter.com": "x",
  "t.co": "x",
  "x.com": "x",
  "fb.com": "facebook",
  "ig.me": "instagram",
  "youtu.be": "youtube",
  "music.youtube.com": "youtube",
  "open.spotify.com": "spotify",
  "stackoverflow.com": "stackoverflow",
  "dev.to": "devdotto",
  "ko-fi.com": "kofi",
  "buymeacoffee.com": "buymeacoffee",
  "buy.me": "buymeacoffee",
  "news.ycombinator.com": "ycombinator",
  "last.fm": "lastdotfm",
};

/** Strip protocol + www and return a lowercase hostname, or null. */
function safeHostname(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Find the brand icon catalogue entry that best matches a URL, if any. */
function detectBrand(url: string): BrandIcon | null {
  const host = safeHostname(url);
  if (!host) return null;

  // 1) Exact hostname overrides
  if (HOSTNAME_OVERRIDES[host]) {
    const slug = HOSTNAME_OVERRIDES[host];
    return BRAND_ICONS.find((i) => i.slug === slug) ?? null;
  }

  // 2) Match against catalogue slugs by checking if the slug is the
  //    leftmost segment of the hostname or appears as a label.
  //    Examples:
  //      - github.com         → "github"
  //      - blog.medium.com    → "medium"
  //      - figma.com          → "figma"
  const labels = host.split(".");
  const candidate = BRAND_ICONS.find((icon) => labels.includes(icon.slug));
  return candidate ?? null;
}

/** Heuristic title from a URL — domain + path's last meaningful segment. */
function defaultTitle(url: string): string {
  const host = safeHostname(url);
  if (!host) return url;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const segs = u.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && last.length < 32) {
      // Capitalize the path tail when meaningful (e.g. "@username")
      return last.startsWith("@") ? last : last.replace(/[-_]/g, " ");
    }
    // Fall back to brand label or hostname
    const brand = detectBrand(url);
    return brand?.label ?? host;
  } catch {
    return host;
  }
}

// ─── Drag-to-reorder (lightweight) ────────────────────────────────────────────

interface DragState {
  from: number;
  over: number;
}

// ─── Per-row editor ───────────────────────────────────────────────────────────

interface RowProps {
  index: number;
  item: LinksBlockItem;
  dragState: DragState | null;
  onChange: (patch: Partial<LinksBlockItem>) => void;
  onRemove: () => void;
  onToggleVisible: () => void;
  onPickIcon: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function Row({
  index,
  item,
  dragState,
  onChange,
  onRemove,
  onToggleVisible,
  onPickIcon,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: RowProps) {
  const isDragging = dragState?.from === index;
  const isOver = dragState != null && dragState.over === index && dragState.from !== index;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "rounded-xl border bg-white p-2.5 transition-all",
        isDragging
          ? "opacity-40 border-primary/30"
          : isOver
          ? "border-primary ring-2 ring-primary/15"
          : "border-stone-200"
      )}
    >
      {/* Header row: drag handle, icon picker, visibility, delete */}
      <div className="flex items-center gap-2 mb-2">
        <span className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500">
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* Icon picker tile — clickable to swap icon */}
        <button
          type="button"
          onClick={onPickIcon}
          title="Change icon"
          className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden p-1.5 hover:bg-stone-200 transition-colors cursor-pointer"
        >
          {item.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.iconUrl}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <Link2 className="w-3.5 h-3.5 text-stone-400" />
          )}
        </button>

        <span className="text-[11px] text-stone-400 font-mono ml-1">#{index + 1}</span>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onToggleVisible}
          title={item.visible === false ? "Show on public page" : "Hide on public page"}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
            item.visible === false
              ? "text-primary bg-primary/10 hover:bg-primary/20"
              : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          )}
        >
          {item.visible === false ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onRemove}
          title="Remove link"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inputs */}
      <div className="space-y-1.5">
        <TextInput
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title"
          className="!py-1.5 !text-sm font-medium"
        />
        <div className="grid grid-cols-1 gap-1.5">
          <TextInput
            value={item.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://example.com"
            className="!py-1.5 !text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <TextInput
            value={item.subtitle ?? ""}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Subtitle (optional)"
            className="!py-1.5 !text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Add bar ──────────────────────────────────────────────────────────────────
//
// Smart "paste a link" UX: the user pastes any URL and we auto-fill the
// brand icon and a sensible title. They can still edit afterwards.

interface AddBarProps {
  onAdd: (item: LinksBlockItem) => void;
  disabled?: boolean;
}

function AddBar({ onAdd, disabled }: AddBarProps) {
  const [draft, setDraft] = useState("");
  // We hold a ref to the underlying input via the wrapper element so we
  // can refocus after each successful add. TextInput doesn't expose a
  // forwardRef so we query through the wrapper at submit time instead.
  const wrapperRef = useRef<HTMLDivElement>(null);

  const detected = useMemo(() => {
    const trimmed = draft.trim();
    if (trimmed.length < 4) return null;
    return detectBrand(trimmed);
  }, [draft]);

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // Default to https:// if user just pasted a bare hostname
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const brand = detected;
    const newItem: LinksBlockItem = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: brand?.label ?? defaultTitle(url),
      subtitle: safeHostname(url) ?? "",
      url,
      iconUrl: brand ? iconUrl(brand) : undefined,
      visible: true,
    };
    onAdd(newItem);
    setDraft("");
    // Refocus the input so a power user can paste, Enter, paste, Enter…
    wrapperRef.current?.querySelector("input")?.focus();
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "p-2.5 rounded-xl border-2 border-dashed transition-colors",
        detected
          ? "border-primary/40 bg-primary/5"
          : "border-stone-200 bg-stone-50"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Detected icon preview — confirms the auto-detection visually */}
        <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
          {detected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl(detected)}
              alt=""
              className="w-full h-full object-contain"
            />
          ) : (
            <Wand2 className="w-3.5 h-3.5 text-stone-400" />
          )}
        </div>

        <div className="relative flex-1 min-w-0">
          <TextInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Paste any URL — github.com/you, instagram.com/…"
            className="!py-1.5 !text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          {detected && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary pointer-events-none">
              {detected.label}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || draft.trim().length === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      <p className="text-[11px] text-stone-500 mt-2 px-0.5">
        We&apos;ll detect the brand from the URL and pick an icon for you. Hit Enter to add.
      </p>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function LinksForm({ config: raw, onSave, onCancel }: BlockFormProps) {
  const init = (raw ?? {}) as LinksBlockConfig;
  const [title, setTitle] = useState(init.title ?? "My links");
  const [subtitle, setSubtitle] = useState(init.subtitle ?? "");
  const [items, setItems] = useState<LinksBlockItem[]>(
    Array.isArray(init.items) ? init.items : []
  );
  const [saving, setSaving] = useState(false);
  const [iconPickerFor, setIconPickerFor] = useState<string | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragFromRef = useRef<number>(-1);

  function patchItem(id: string, patch: Partial<LinksBlockItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (iconPickerFor === id) setIconPickerFor(null);
  }
  function toggleVisible(id: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, visible: !(it.visible !== false) } : it
      )
    );
  }
  function addItem(item: LinksBlockItem) {
    setItems((prev) => [...prev, item]);
  }

  function handleDragStart(i: number) {
    dragFromRef.current = i;
    setDragState({ from: i, over: i });
  }
  function handleDragEnter(i: number) {
    if (dragFromRef.current === -1) return;
    setDragState((prev) => (prev ? { ...prev, over: i } : prev));
  }
  function handleDragEnd() {
    if (!dragState) {
      dragFromRef.current = -1;
      return;
    }
    const { from, over } = dragState;
    if (from !== over) {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(over, 0, moved);
        return next;
      });
    }
    dragFromRef.current = -1;
    setDragState(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ title, subtitle, items });
  }

  const pickerItem = items.find((it) => it.id === iconPickerFor) ?? null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Card header copy */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Card
        </div>
        <Field label="Title (optional)" htmlFor="links-title">
          <TextInput
            id="links-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My links"
          />
        </Field>
        <Field label="Subtitle (optional)" htmlFor="links-subtitle">
          <TextInput
            id="links-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Pinned things I share most"
          />
        </Field>
      </div>

      {/* Add bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Links
          </div>
          <span className="text-[11px] text-stone-400">{items.length} total</span>
        </div>
        <AddBar onAdd={addItem} />
      </div>

      {/* Existing rows */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <Row
              key={item.id}
              index={i}
              item={item}
              dragState={dragState}
              onChange={(patch) => patchItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
              onToggleVisible={() => toggleVisible(item.id)}
              onPickIcon={() =>
                setIconPickerFor((cur) => (cur === item.id ? null : item.id))
              }
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {/* Inline icon picker — opens for one row at a time */}
      {pickerItem && (
        <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-stone-700">
              Icon for &ldquo;{pickerItem.title || "Untitled link"}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setIconPickerFor(null)}
              className="text-[11px] text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Done
            </button>
          </div>
          <IconGallery
            value={pickerItem.iconUrl ?? ""}
            onChange={(url) => patchItem(pickerItem.id, { iconUrl: url || undefined })}
          />
          {pickerItem.url && (
            <a
              href={pickerItem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Test link
            </a>
          )}
        </div>
      )}

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
