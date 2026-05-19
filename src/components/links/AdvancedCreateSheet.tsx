"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Link2,
  Loader2,
  Dice5,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  Tag,
} from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { cn, getDefaultDomain } from "@/lib/utils";

type TabKey = "general" | "utm" | "advanced";

type Prefill = {
  destination?: string;
  slug?: string;
};

type Props = {
  workspaceId: string;
  defaultDomain?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: Prefill;
  onCreated?: (link: any) => void;
};

const initialState = {
  destination: "",
  slug: "",
  title: "",
  tags: [] as string[],
  // utm
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmTerm: "",
  utmContent: "",
  // advanced
  expiresAt: "",
  clickLimit: "" as string | "",
  expirationMode: "date" as "date" | "clicks",
  password: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  iosDestination: "",
  androidDestination: "",
};

function generateSlug() {
  // Friendly random slug: 6 lowercase alphanumerics
  return Math.random().toString(36).slice(2, 8);
}

export function AdvancedCreateSheet({
  workspaceId,
  defaultDomain = getDefaultDomain(),
  open,
  onOpenChange,
  prefill,
  onCreated,
}: Props) {
  const [tab, setTab] = useState<TabKey>("general");
  const [form, setForm] = useState(initialState);
  const [tagInput, setTagInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();

  // Reset & apply prefill when opening
  useEffect(() => {
    if (open) {
      setTab("general");
      setForm({
        ...initialState,
        destination: prefill?.destination ?? "",
        slug: prefill?.slug ?? "",
      });
      setTagInput("");
      setError(null);
      setShowPassword(false);
    }
  }, [open, prefill]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Build destination preview with UTMs
  const destinationWithUtms = (() => {
    if (!form.destination) return "";
    try {
      const url = new URL(
        /^https?:\/\//i.test(form.destination) ? form.destination : `https://${form.destination}`,
      );
      const utms: [string, string][] = [
        ["utm_source", form.utmSource],
        ["utm_medium", form.utmMedium],
        ["utm_campaign", form.utmCampaign],
        ["utm_term", form.utmTerm],
        ["utm_content", form.utmContent],
      ];
      utms.forEach(([k, v]) => {
        if (v.trim()) url.searchParams.set(k, v.trim());
      });
      return url.toString();
    } catch {
      return form.destination;
    }
  })();

  const previewSlug = form.slug.trim() || "your-slug";
  const previewShort = `https://${defaultDomain}/${previewSlug}`;

  function handleAddTagFromInput() {
    const next = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !form.tags.includes(t));
    if (next.length === 0) return;
    update("tags", [...form.tags, ...next]);
    setTagInput("");
  }

  function removeTag(t: string) {
    update("tags", form.tags.filter((x) => x !== t));
  }

  async function submit() {
    setError(null);
    if (!form.destination.trim()) {
      setError("Destination URL is required");
      setTab("general");
      return;
    }
    const normalizedDest = /^https?:\/\//i.test(form.destination)
      ? form.destination
      : `https://${form.destination}`;
    try {
      new URL(normalizedDest);
    } catch {
      setError("Invalid destination URL");
      setTab("general");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        workspaceId,
        destination: normalizedDest,
        slug: form.slug.trim() || undefined,
        title: form.title.trim() || undefined,
        tags: form.tags,
        utmSource: form.utmSource || undefined,
        utmMedium: form.utmMedium || undefined,
        utmCampaign: form.utmCampaign || undefined,
        utmTerm: form.utmTerm || undefined,
        utmContent: form.utmContent || undefined,
        password: form.password || undefined,
        ogTitle: form.ogTitle || undefined,
        ogDescription: form.ogDescription || undefined,
        ogImage: form.ogImage || undefined,
        iosDestination: form.iosDestination || undefined,
        androidDestination: form.androidDestination || undefined,
      };

      if (form.expirationMode === "date" && form.expiresAt) {
        payload.expiresAt = new Date(form.expiresAt).toISOString();
      }
      if (form.expirationMode === "clicks" && form.clickLimit) {
        const n = Number(form.clickLimit);
        if (Number.isFinite(n) && n > 0) payload.clickLimit = n;
      }

      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to create link");
        return;
      }
      onCreated?.(data.link);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[960px] flex-col bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Create Link</h2>
                <p className="text-xs text-muted-foreground">
                  Configure destination, UTMs and advanced options.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border px-6">
              {([
                { key: "general", label: "General" },
                { key: "utm", label: "UTM Parameters" },
                { key: "advanced", label: "Advanced" },
              ] as { key: TabKey; label: string }[]).map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative px-3 py-3 text-sm font-medium transition-colors",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                    {active && (
                      <motion.span
                        layoutId="adv-create-tab"
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
              {/* Left: tab content */}
              <div className="overflow-y-auto px-6 py-5">
                {tab === "general" && (
                  <div className="space-y-5">
                    <Field label="Destination URL" required>
                      <input
                        value={form.destination}
                        onChange={(e) => update("destination", e.target.value)}
                        placeholder="https://example.com/very/long/path"
                        className={inputCls}
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Domain">
                        <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm">
                          <span className="text-muted-foreground">{defaultDomain}</span>
                        </div>
                      </Field>
                      <Field
                        label="Custom slug"
                        hint={`${form.slug.length}/50`}
                        action={
                          <button
                            type="button"
                            onClick={() => update("slug", generateSlug())}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Dice5 className="h-3.5 w-3.5" />
                            Generate
                          </button>
                        }
                      >
                        <input
                          value={form.slug}
                          onChange={(e) =>
                            update("slug", e.target.value.replace(/\s+/g, "-").slice(0, 50))
                          }
                          placeholder="auto-generated"
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    <Field label="Title" hint="auto-filled from destination soon">
                      <input
                        value={form.title}
                        onChange={(e) => update("title", e.target.value)}
                        placeholder="My awesome link"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Tags" hint="Press Enter or comma to add">
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 min-h-10">
                        {form.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                          >
                            <Tag className="h-3 w-3" />
                            {t}
                            <button
                              type="button"
                              onClick={() => removeTag(t)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddTagFromInput();
                            } else if (
                              e.key === "Backspace" &&
                              !tagInput &&
                              form.tags.length > 0
                            ) {
                              update("tags", form.tags.slice(0, -1));
                            }
                          }}
                          onBlur={handleAddTagFromInput}
                          placeholder={form.tags.length === 0 ? "promo, summer, sales" : ""}
                          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                        />
                      </div>
                    </Field>
                  </div>
                )}

                {tab === "utm" && (
                  <div className="space-y-5">
                    <p className="text-xs text-muted-foreground">
                      UTM parameters get appended to the destination URL when the short link is
                      visited.
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="utm_source" hint="newsletter, facebook">
                        <input
                          value={form.utmSource}
                          onChange={(e) => update("utmSource", e.target.value)}
                          placeholder="newsletter"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="utm_medium" hint="email, cpc">
                        <input
                          value={form.utmMedium}
                          onChange={(e) => update("utmMedium", e.target.value)}
                          placeholder="email"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="utm_campaign" hint="spring_sale">
                        <input
                          value={form.utmCampaign}
                          onChange={(e) => update("utmCampaign", e.target.value)}
                          placeholder="spring_sale"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="utm_term">
                        <input
                          value={form.utmTerm}
                          onChange={(e) => update("utmTerm", e.target.value)}
                          placeholder="running+shoes"
                          className={inputCls}
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="utm_content">
                          <input
                            value={form.utmContent}
                            onChange={(e) => update("utmContent", e.target.value)}
                            placeholder="logolink"
                            className={inputCls}
                          />
                        </Field>
                      </div>
                    </div>

                    {destinationWithUtms && (
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Final destination
                        </p>
                        <p className="break-all text-xs font-mono text-foreground/90">
                          {destinationWithUtms}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {tab === "advanced" && (
                  <div className="space-y-5">
                    {/* Expiration */}
                    <div>
                      <p className="text-sm font-medium mb-2">Expiration</p>
                      <div className="flex items-center gap-4 mb-3">
                        {(["date", "clicks"] as const).map((mode) => (
                          <label
                            key={mode}
                            className="inline-flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <input
                              type="radio"
                              checked={form.expirationMode === mode}
                              onChange={() => update("expirationMode", mode)}
                              className="accent-[hsl(var(--primary))]"
                            />
                            {mode === "date" ? "On date" : "After N clicks"}
                          </label>
                        ))}
                      </div>
                      {form.expirationMode === "date" ? (
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="datetime-local"
                            value={form.expiresAt}
                            onChange={(e) => update("expiresAt", e.target.value)}
                            className={cn(inputCls, "pl-9")}
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          value={form.clickLimit}
                          onChange={(e) => update("clickLimit", e.target.value)}
                          placeholder="100"
                          className={inputCls}
                        />
                      )}
                    </div>

                    {/* Password */}
                    <Field label="Password protection">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          placeholder="Leave blank to disable"
                          className={cn(inputCls, "pr-10")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </Field>

                    {/* OG override */}
                    <div>
                      <p className="text-sm font-medium mb-2">Open Graph override</p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="OG title">
                          <input
                            value={form.ogTitle}
                            onChange={(e) => update("ogTitle", e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="OG image URL">
                          <input
                            value={form.ogImage}
                            onChange={(e) => update("ogImage", e.target.value)}
                            placeholder="https://.../image.png"
                            className={inputCls}
                          />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="OG description">
                            <textarea
                              value={form.ogDescription}
                              onChange={(e) => update("ogDescription", e.target.value)}
                              rows={2}
                              className={cn(inputCls, "h-auto resize-y")}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>

                    {/* Device routing */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="iOS destination">
                        <input
                          value={form.iosDestination}
                          onChange={(e) => update("iosDestination", e.target.value)}
                          placeholder="https://apps.apple.com/..."
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Android destination">
                        <input
                          value={form.androidDestination}
                          onChange={(e) => update("androidDestination", e.target.value)}
                          placeholder="https://play.google.com/..."
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: live preview */}
              <aside className="hidden lg:flex flex-col gap-4 border-l border-border bg-card/40 p-5 overflow-y-auto">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Live preview
                  </p>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      Short link
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(previewShort)}
                      className="mt-1 group flex w-full items-center justify-between gap-2 text-left"
                    >
                      <span className="font-mono text-sm font-semibold text-primary truncate">
                        {previewShort}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </span>
                    </button>
                    {form.title && (
                      <p className="mt-3 text-sm font-medium">{form.title}</p>
                    )}
                    {form.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {form.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(form.ogTitle || form.ogDescription || form.ogImage) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Social preview
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border bg-background">
                      {form.ogImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.ogImage}
                          alt=""
                          className="aspect-[1.91/1] w-full object-cover"
                        />
                      )}
                      <div className="p-3">
                        <p className="text-[11px] uppercase text-muted-foreground">
                          {defaultDomain}
                        </p>
                        <p className="text-sm font-semibold leading-snug">
                          {form.ogTitle || "Title preview"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {form.ogDescription || "Description preview"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border bg-background px-6 py-4">
              <div className="min-h-5 text-xs">
                {error && <span className="font-medium text-red-500">{error}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Link
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

function Field({
  label,
  required,
  hint,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-foreground">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        <span className="flex items-center gap-2">
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
          {action}
        </span>
      </div>
      {children}
    </label>
  );
}
