"use client";

import { useEffect, useState } from "react";
import { Field, TextInput, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";
import { cn } from "@/lib/utils";
import { Loader2, Mail, Download, Search, RefreshCw, Inbox } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Public schema for the WaitlistBlock config. Kept in sync with
 * `WaitlistBlockConfig` in `WaitlistBlock.tsx`.
 *
 * `mode` determines where the submission goes:
 *   - "internal" (default): records a `submission` event on this block.
 *     Owner reads the emails from the analytics panel.
 *   - "getwaitlist": forwards to getwaitlist.com using `waitlistId`.
 *     Kept for backward-compat with anyone already wired to that service.
 */
export interface WaitlistConfig {
  title?: string;
  label?: string;
  buttonLabel?: string;
  successTitle?: string;
  successLabel?: string;
  placeholder?: string;
  /** Submission destination */
  mode?: "internal" | "getwaitlist";
  /** Used only when mode === "getwaitlist" */
  waitlistId?: string;
  /** Visual variant for the block on the canvas / public page */
  variant?: "card" | "minimal" | "gradient";
  /** Accent colour applied to the submit button (hex) */
  accentColor?: string;
  /** Whether to fire celebratory confetti on success (default true) */
  confetti?: boolean;
}

const DEFAULT_ACCENT = "#6366F1";

// ─── Variant picker ───────────────────────────────────────────────────────────

const VARIANTS: { id: NonNullable<WaitlistConfig["variant"]>; label: string; preview: string }[] = [
  { id: "card", label: "Card", preview: "bg-white border border-stone-200" },
  { id: "minimal", label: "Minimal", preview: "bg-stone-50 border border-stone-100" },
  { id: "gradient", label: "Gradient", preview: "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" },
];

function VariantPicker({
  value,
  onChange,
}: {
  value: WaitlistConfig["variant"];
  onChange: (v: NonNullable<WaitlistConfig["variant"]>) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {VARIANTS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={cn(
            "relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer",
            value === v.id ? "border-primary bg-primary/5" : "border-stone-200 hover:border-stone-300"
          )}
        >
          <div className={cn("w-full h-10 rounded-lg", v.preview)} />
          <span className="text-[11px] font-medium text-stone-700">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Mode picker ──────────────────────────────────────────────────────────────

function ModeCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all cursor-pointer",
        active ? "border-primary bg-primary/5" : "border-stone-200 hover:border-stone-300 bg-white"
      )}
    >
      <span className="text-xs font-semibold text-stone-900">{title}</span>
      <span className="text-[11px] text-stone-500 leading-relaxed">{description}</span>
    </button>
  );
}

// ─── Submissions tab ──────────────────────────────────────────────────────────

interface Submission {
  email: string;
  createdAt: string;
  country: string | null;
  device: string | null;
}

function SubmissionsList({ blockId }: { blockId: string }) {
  const [items, setItems] = useState<Submission[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bio/blocks/${blockId}/submissions`);
      if (!res.ok) {
        if (res.status === 404) {
          // Block hasn't been saved to DB yet — show a friendlier message
          setItems([]);
          setError("Save the block before submissions can be collected.");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as { submissions: Submission[] };
      setItems(body.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  async function copyAll() {
    if (!items?.length) return;
    const text = items.map((s) => s.email).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable in iframes — silent fail */
    }
  }

  function downloadCsv() {
    // Use the export endpoint directly so we don't have to re-build the
    // CSV in the browser. Browsers handle the auth cookie automatically.
    window.open(`/api/bio/blocks/${blockId}/submissions?format=csv`, "_blank");
  }

  const filtered = (items ?? []).filter((s) =>
    filter.trim() === "" ? true : s.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header row: count + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-xs text-stone-700">
            <span className="font-semibold">{items?.length ?? "—"}</span>
            <span className="text-stone-400"> total signups</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyAll}
            disabled={!items?.length}
            title="Copy all emails to clipboard"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Mail className="w-3 h-3" />
            Copy
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!items?.length}
            title="Export as CSV"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter */}
      {items && items.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter emails…"
            className="w-full h-8 pl-7 pr-3 text-xs rounded-lg border border-stone-200 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {loading && items === null ? (
          <div className="px-3 py-6 flex items-center justify-center gap-2 text-xs text-stone-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading submissions…
          </div>
        ) : error && (!items || items.length === 0) ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-stone-500">{error}</p>
          </div>
        ) : items && items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Inbox className="w-6 h-6 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-600 mb-0.5">
              No signups yet
            </p>
            <p className="text-[11px] text-stone-400">
              Emails submitted on the live page will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-stone-400">No matches for "{filter}"</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
            {filtered.map((s) => (
              <li key={s.email} className="flex items-center justify-between px-3 py-2 gap-2">
                <span className="text-xs text-stone-800 truncate flex-1">{s.email}</span>
                <span className="text-[10px] text-stone-400 shrink-0 tabular-nums">
                  {new Date(s.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-stone-400">
        Submissions are also visible in the Analytics panel as block submission events.
      </p>
    </div>
  );
}

// ─── WaitlistForm ─────────────────────────────────────────────────────────────

export function WaitlistForm({ config: raw, onSave, onCancel, blockId }: BlockFormProps) {
  const init = raw as WaitlistConfig;
  const [title, setTitle] = useState(init.title ?? "Join the waitlist");
  const [label, setLabel] = useState(init.label ?? "Be the first to hear when we launch — no spam, ever.");
  const [buttonLabel, setButtonLabel] = useState(init.buttonLabel ?? "Notify me");
  const [successTitle, setSuccessTitle] = useState(init.successTitle ?? "You're on the list! 🎉");
  const [successLabel, setSuccessLabel] = useState(init.successLabel ?? "We'll be in touch soon.");
  const [placeholder, setPlaceholder] = useState(init.placeholder ?? "you@example.com");
  const [mode, setMode] = useState<NonNullable<WaitlistConfig["mode"]>>(init.mode ?? "internal");
  const [waitlistId, setWaitlistId] = useState(init.waitlistId ?? "");
  const [variant, setVariant] = useState<NonNullable<WaitlistConfig["variant"]>>(init.variant ?? "card");
  const [accentColor, setAccentColor] = useState(init.accentColor ?? DEFAULT_ACCENT);
  const [confetti, setConfetti] = useState(init.confetti !== false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"design" | "submissions">("design");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({
      title,
      label,
      buttonLabel,
      successTitle,
      successLabel,
      placeholder,
      mode,
      waitlistId: mode === "getwaitlist" ? waitlistId : "",
      variant,
      accentColor,
      confetti,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 p-0.5 bg-stone-100 rounded-xl">
        <button
          type="button"
          onClick={() => setTab("design")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            tab === "design"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          )}
        >
          Design
        </button>
        <button
          type="button"
          onClick={() => setTab("submissions")}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1",
            tab === "submissions"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          )}
        >
          <Inbox className="w-3 h-3" />
          Submissions
        </button>
      </div>

      {tab === "submissions" ? (
        <SubmissionsList blockId={blockId} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Copy ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Copy
        </div>

        <Field label="Title" htmlFor="wl-title">
          <TextInput
            id="wl-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Join the waitlist"
            required
          />
        </Field>

        <Field label="Description" htmlFor="wl-label">
          <TextInput
            id="wl-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Be the first to hear when we launch."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Button text" htmlFor="wl-btn">
            <TextInput
              id="wl-btn"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              placeholder="Notify me"
              required
            />
          </Field>
          <Field label="Email placeholder" htmlFor="wl-placeholder">
            <TextInput
              id="wl-placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
        </div>
      </div>

      {/* ── Success state ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          After signup
        </div>

        <Field label="Success title" htmlFor="wl-success-title">
          <TextInput
            id="wl-success-title"
            value={successTitle}
            onChange={(e) => setSuccessTitle(e.target.value)}
            placeholder="You're on the list! 🎉"
          />
        </Field>

        <Field label="Success message" htmlFor="wl-success-label">
          <TextInput
            id="wl-success-label"
            value={successLabel}
            onChange={(e) => setSuccessLabel(e.target.value)}
            placeholder="We'll be in touch soon."
          />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confetti}
            onChange={(e) => setConfetti(e.target.checked)}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <span className="text-xs text-stone-700">
            Celebrate with a confetti blast on signup
          </span>
        </label>
      </div>

      {/* ── Style ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Style
        </div>

        <Field label="Variant">
          <VariantPicker value={variant} onChange={setVariant} />
        </Field>

        <Field label="Accent color" htmlFor="wl-accent">
          <div className="flex items-center gap-2">
            <input
              id="wl-accent"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer bg-white"
              aria-label="Accent color"
            />
            <TextInput
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#6366F1"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
            <button
              type="button"
              onClick={() => setAccentColor(DEFAULT_ACCENT)}
              className="text-[11px] text-stone-500 hover:text-stone-800 px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </Field>
      </div>

      {/* ── Destination ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Where do submissions go?
        </div>

        <div className="grid grid-cols-2 gap-2">
          <ModeCard
            active={mode === "internal"}
            title="In analytics"
            description="Emails are saved here. View them in the Submissions tab above or in Analytics."
            onClick={() => setMode("internal")}
          />
          <ModeCard
            active={mode === "getwaitlist"}
            title="getwaitlist.com"
            description="Also forward each signup to your getwaitlist.com waitlist."
            onClick={() => setMode("getwaitlist")}
          />
        </div>

        {mode === "getwaitlist" && (
          <Field
            label="Waitlist ID"
            htmlFor="wl-id"
            hint="Find this in your getwaitlist.com settings"
          >
            <TextInput
              id="wl-id"
              value={waitlistId}
              onChange={(e) => setWaitlistId(e.target.value)}
              placeholder="12345"
              required
            />
          </Field>
        )}
      </div>

      <FormFooter onCancel={onCancel} saving={saving} />
        </form>
      )}
    </div>
  );
}
