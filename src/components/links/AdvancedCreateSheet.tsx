"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Link2,
  Loader2,
  Dice5,
  Eye,
  EyeOff,
  Copy,
  Check,
  Tag,
  Sparkles,
  Plus,
  Trash2,
  Folder,
  ChevronDown,
  CircleCheck,
  QrCode,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DatePicker } from "@/components/ui/DatePicker";
import { useClipboard } from "@/hooks/use-clipboard";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn, getShortLinkBase, getDefaultDomain } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";

type TabKey = "general" | "utm" | "abtesting" | "routing" | "advanced";

type Prefill = {
  id?: string;
  destination?: string;
  slug?: string;
  folderId?: string | null;
};

export type FolderOption = {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string | null;
  workspaceId?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  linkCount?: number;
};

type Props = {
  workspaceId: string;
  defaultDomain?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: Prefill;
  onCreated?: (link: any) => void;
  folders?: FolderOption[];
  onFolderCreate?: (folder: FolderOption) => void;
};

const initialState = {
  destination: "",
  slug: "",
  title: "",
  tags: [] as string[],
  folderId: "" as string | null,
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmTerm: "",
  utmContent: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  iosDestination: "",
  androidDestination: "",
  password: "",
  expirationMode: "date" as "date" | "clicks",
  expiresAt: "",
  clickLimit: "",
  // scheduling
  scheduleMode: false,
  scheduledAt: "",
  abTestEnabled: false,
  abTestVariants: [] as { id?: string; destination: string; weight: number; label?: string }[],
  routingRules: [] as { condition: { device?: string; country?: string; language?: string }; destination: string }[],
  // Deep linking
  deepLinkEnabled: false,
  uriScheme: "",
  iosAppStoreId: "",
  androidPlayStoreId: "",
  iosBundleId: "",
  androidPackageName: "",
  sha256CertFingerprints: [] as string[],
  universalLinksEnabled: false,
  appLinksEnabled: false,
};

function generateSlug() {
  // Friendly random slug: 6 lowercase alphanumerics
  return Math.random().toString(36).slice(2, 8);
}

export function AdvancedCreateSheet({
  workspaceId,
  defaultDomain = getShortLinkBase(),
  open,
  onOpenChange,
  prefill,
  onCreated,
  folders = [],
  onFolderCreate,
}: Props) {
  const [tab, setTab] = useState<TabKey>("general");
  const [form, setForm] = useState(initialState);
  const [tagInput, setTagInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiEnrichLoading, setAiEnrichLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useClipboard();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isEdit = !!prefill?.id;

  // Reset & apply prefill when opening
  useEffect(() => {
    if (open) {
      setTab("general");
      setTagInput("");
      setError(null);
      setShowPassword(false);

      if (prefill?.id) {
        // Edit mode — fetch full link data
        fetch(`/api/links/${prefill.id}?workspaceId=${workspaceId}`)
          .then((r) => r.json())
          .then((res) => {
            const d = res.link ?? res.data ?? res;
            setForm((prev) => ({
              ...prev,
              destination: d.destination ?? "",
              slug: d.slug ?? "",
              title: d.title ?? "",
              tags: d.tags ?? [],
              folderId: d.folderId ?? null,
              utmSource: d.utmSource ?? "",
              utmMedium: d.utmMedium ?? "",
              utmCampaign: d.utmCampaign ?? "",
              utmTerm: d.utmTerm ?? "",
              utmContent: d.utmContent ?? "",
              ogTitle: d.ogTitle ?? "",
              ogDescription: d.ogDescription ?? "",
              ogImage: d.ogImage ?? "",
              iosDestination: d.iosDestination ?? "",
              androidDestination: d.androidDestination ?? "",
              uriScheme: d.uriScheme ?? "",
              iosAppStoreId: d.iosAppStoreId ?? "",
              androidPlayStoreId: d.androidPlayStoreId ?? "",
              iosBundleId: d.iosBundleId ?? "",
              androidPackageName: d.androidPackageName ?? "",
              sha256CertFingerprints: d.sha256CertFingerprints ?? [],
              universalLinksEnabled: d.universalLinksEnabled ?? false,
              appLinksEnabled: d.appLinksEnabled ?? false,
              deepLinkEnabled: !!(d.uriScheme || d.iosAppStoreId || d.androidPlayStoreId),
              password: "",
              expirationMode: d.expiresAt ? "date" : d.clickLimit ? "clicks" : "date",
              expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : "",
              clickLimit: d.clickLimit ?? "",
              scheduleMode: !!d.scheduledAt,
              scheduledAt: d.scheduledAt ? d.scheduledAt.slice(0, 16) : "",
              abTestEnabled: d.abTestEnabled ?? false,
              abTestVariants: d.abTestVariants ?? [],
              routingRules: d.routingRules ?? [],
            }));
          })
          .catch(() => {});
      } else {
        setForm({
          ...initialState,
          destination: prefill?.destination ?? "",
          slug: prefill?.slug ?? "",
        });
      }
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

  // QR target always carries ?source=qr so we can attribute scans separately
  // in the per-QR analytics breakdown. The official main domain is the host
  // (`defaultDomain` is wired up by the parent from `getDefaultDomain()`).
  const previewQrUrl = useMemo(() => {
    if (!form.destination && !form.slug.trim()) return "";
    const base = `https://${defaultDomain}/${previewSlug}`;
    return `${base}?source=qr`;
  }, [defaultDomain, previewSlug, form.destination, form.slug]);

  const qrSvgRef = useRef<SVGSVGElement | null>(null);

  function handleDownloadQr() {
    const svg = qrSvgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob(
      ['<?xml version="1.0" standalone="no"?>\n', svgString],
      { type: "image/svg+xml" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${previewSlug || "qr"}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

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
        folderId: form.folderId || null,
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
        abTestEnabled: form.abTestEnabled || undefined,
        abTestVariants:
          form.abTestEnabled && form.abTestVariants.length > 0
            ? form.abTestVariants.map((v, i) => ({
                id: (v as any).id ?? crypto.randomUUID(),
                destination: v.destination,
                weight: v.weight,
                label: (v as any).label ?? `Variant ${String.fromCharCode(65 + i)}`,
              }))
            : undefined,
        routingRules:
          form.routingRules.length > 0
            ? form.routingRules.map((r) => ({
                condition: {
                  ...(r.condition.device ? { device: r.condition.device } : {}),
                  ...(r.condition.country ? { country: r.condition.country } : {}),
                  ...(r.condition.language ? { language: r.condition.language } : {}),
                },
                destination: r.destination,
              }))
            : undefined,
        uriScheme: form.deepLinkEnabled ? (form.uriScheme || undefined) : undefined,
        iosAppStoreId: form.deepLinkEnabled ? (form.iosAppStoreId || undefined) : undefined,
        androidPlayStoreId: form.deepLinkEnabled ? (form.androidPlayStoreId || undefined) : undefined,
        iosBundleId: form.deepLinkEnabled ? (form.iosBundleId || undefined) : undefined,
        androidPackageName: form.deepLinkEnabled ? (form.androidPackageName || undefined) : undefined,
        sha256CertFingerprints: form.deepLinkEnabled ? (form.sha256CertFingerprints.length > 0 ? form.sha256CertFingerprints : undefined) : undefined,
        universalLinksEnabled: form.deepLinkEnabled ? form.universalLinksEnabled : undefined,
        appLinksEnabled: form.deepLinkEnabled ? form.appLinksEnabled : undefined,
      };

      if (form.scheduleMode && form.scheduledAt) {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString();
      }
      if (form.expirationMode === "date" && form.expiresAt) {
        payload.expiresAt = new Date(form.expiresAt).toISOString();
      }
      if (form.expirationMode === "clicks" && form.clickLimit) {
        const n = Number(form.clickLimit);
        if (Number.isFinite(n) && n > 0) payload.clickLimit = n;
      }

      const isEdit = !!prefill?.id;
      const url = isEdit ? `/api/links/${prefill.id}` : "/api/links";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to save link");
        return;
      }
      const link = data.link ?? data.data ?? data;
      onOpenChange(false);
      onCreated?.(link);
      toast.success(isEdit ? "Link updated" : "Link created");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-sm:!left-0 max-sm:!top-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none max-sm:border-0 flex-col p-0 gap-0",
          "sm:max-w-[960px]"
        )}
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{isEdit ? "Edit Link" : "Create Link"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update destination, UTMs and advanced options." : "Configure destination, UTMs and advanced options."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-6 shrink-0">
          {([
            { key: "general", label: "General" },
            { key: "utm", label: "UTM Parameters" },
            { key: "abtesting", label: "A/B Testing" },
            { key: "routing", label: "Smart Routing" },
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
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
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
                            <span className="flex items-center gap-2">
                              {form.destination && (
                                <button
                                  type="button"
                                  disabled={aiSuggestLoading}
                                  onClick={async () => {
                                    setAiSuggestLoading(true);
                                    try {
                                      const res = await fetch("/api/ai/suggest-slug", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ url: form.destination, workspaceId }),
                                      });
                                      if (!res.ok) {
                                        const err = await res.json().catch(() => ({}));
                                        throw new Error(err.error || `Server error (${res.status})`);
                                      }
                                      const data = await res.json();
                                      if (data.slug) update("slug", data.slug);
                                      if (data.title) update("title", data.title);
                                      if (data.description) update("ogDescription", data.description);
                                      // Merge AI suggested tags (deduplicate)
                                      if (Array.isArray(data.suggestedTags) && data.suggestedTags.length > 0) {
                                        setForm((prev) => ({
                                          ...prev,
                                          tags: [...new Set([...prev.tags, ...data.suggestedTags])],
                                        }));
                                      }
                                      // Map AI folder name to existing folder ID
                                      if (data.suggestedFolder) {
                                        const match = folders.find(
                                          (f) => f.name.toLowerCase() === data.suggestedFolder.toLowerCase()
                                        );
                                        if (match) update("folderId", match.id);
                                      }
                                      toast.success("Fields auto-filled from AI");
                                    } catch (e) {
                                      console.error("AI suggest failed:", e);
                                      toast.error("AI suggest failed. Check console for details.");
                                    } finally {
                                      setAiSuggestLoading(false);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {aiSuggestLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3 w-3" />
                                  )}
                                  AI Suggest
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => update("slug", generateSlug())}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <Dice5 className="h-3.5 w-3.5" />
                                Generate
                              </button>
                            </span>
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

                    <Field
                      label="Title"
                      action={
                        form.destination && (
                          <button
                            type="button"
                            disabled={aiEnrichLoading}
                            onClick={async () => {
                              setAiEnrichLoading(true);
                              try {
                                const res = await fetch("/api/ai/enrich-link", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ url: form.destination }),
                                });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || `Server error (${res.status})`);
                                }
                                const data = await res.json();
                                let filled = 0;
                                if (data.title) { update("title", data.title); filled++; }
                                if (data.description) { update("ogDescription", data.description); filled++; }
                                if (data.ogImage) { update("ogImage", data.ogImage); filled++; }
                                if (filled) toast.success(`Auto-filled ${filled} field${filled > 1 ? "s" : ""}`);
                                else toast.error("Could not auto-fill — page unreachable or no metadata found");
                              } catch (e) {
                                console.error("Auto-fill failed:", e);
                                toast.error("Auto-fill failed. Check console for details.");
                              } finally {
                                setAiEnrichLoading(false);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-violet-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {aiEnrichLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Auto-fill
                          </button>
                        )
                      }
                    >
                      <input
                        value={form.title}
                        onChange={(e) => update("title", e.target.value)}
                        placeholder="My awesome link"
                        className={inputCls}
                      />
                    </Field>
                    {(form.title || form.ogDescription || form.ogImage || form.destination) && (
                      <div className="flex gap-2">
                        <Field label="Description">
                          <input
                            value={form.ogDescription}
                            onChange={(e) => update("ogDescription", e.target.value)}
                            placeholder="Link preview description"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="OG Image URL">
                          <input
                            value={form.ogImage}
                            onChange={(e) => update("ogImage", e.target.value)}
                            placeholder="https://..."
                            className={inputCls}
                          />
                        </Field>
                      </div>
                    )}

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

                    <Field label="Folder">
                      <FolderSelector
                        folders={folders}
                        selectedId={form.folderId}
                        onSelect={(id) => update("folderId", id)}
                        onCreateFolder={onFolderCreate}
                        workspaceId={workspaceId}
                      />
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

                {tab === "abtesting" && (
                  <div className="space-y-5">
                    <p className="text-xs text-muted-foreground">
                      Route visitors to different destinations based on weighted traffic split.
                      Requires the Growth plan or above.
                    </p>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.abTestEnabled}
                        onChange={(e) => {
                          update("abTestEnabled", e.target.checked);
                          if (e.target.checked && form.abTestVariants.length === 0) {
                            update("abTestVariants", [
                              { id: crypto.randomUUID(), destination: form.destination || "", weight: 50, label: "Control" },
                              { id: crypto.randomUUID(), destination: "", weight: 50, label: "Variant B" },
                            ]);
                          }
                        }}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm font-medium text-foreground">Enable A/B testing</span>
                    </label>

                    {form.abTestEnabled && (
                      <>
                        <div className="space-y-3">
                          {form.abTestVariants.map((v, i) => {
                            const totalWeight = form.abTestVariants.reduce((s, x) => s + (x.weight || 0), 0);
                            const pct = totalWeight > 0 ? Math.round((v.weight / totalWeight) * 100) : 0;
                            return (
                              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-foreground">
                                    Variant {String.fromCharCode(65 + i)}
                                  </span>
                                  {form.abTestVariants.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        update(
                                          "abTestVariants",
                                          form.abTestVariants.filter((_, j) => j !== i)
                                        )
                                      }
                                      className="text-xs text-red-500 hover:underline"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 inline" /> Remove
                                    </button>
                                  )}
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground mb-1 block">Destination</span>
                                  <input
                                    value={v.destination}
                                    onChange={(e) => {
                                      const next = [...form.abTestVariants];
                                      next[i] = { ...next[i], destination: e.target.value };
                                      update("abTestVariants", next);
                                    }}
                                    placeholder="https://example.com/variant-a"
                                    className={inputCls}
                                  />
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground mb-1 block">Weight ({pct}%)</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={v.weight}
                                    onChange={(e) => {
                                      const next = [...form.abTestVariants];
                                      next[i] = { ...next[i], weight: Number(e.target.value) || 0 };
                                      update("abTestVariants", next);
                                    }}
                                    className={inputCls}
                                  />
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            update("abTestVariants", [
                              ...form.abTestVariants,
                              { id: crypto.randomUUID(), destination: "", weight: 1, label: `Variant ${String.fromCharCode(65 + form.abTestVariants.length)}` },
                            ])
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add variant
                        </button>

                        {prefill?.id && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/ai/optimize-ab", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ linkId: prefill.id }),
                                });
                                if (!res.ok) return;
                                const data = await res.json();
                                if (data.suggestion?.suggestedWeights) {
                                  const next = [...form.abTestVariants];
                                  for (const sw of data.suggestion.suggestedWeights) {
                                    if (next[sw.variantIndex]) {
                                      next[sw.variantIndex] = {
                                        ...next[sw.variantIndex],
                                        weight: sw.weight,
                                      };
                                    }
                                  }
                                  update("abTestVariants", next);
                                }
                              } catch {}
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-violet-500 hover:underline"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Optimize
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {tab === "routing" && (
                  <div className="space-y-5">
                    <p className="text-xs text-muted-foreground">
                      Send visitors to different destinations based on their device, country, or
                      language. Rules are checked in order — the first match wins.
                    </p>

                    {(form.routingRules ?? []).map((rule, i) => (
                      <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Rule {i + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(form.routingRules ?? [])];
                              next.splice(i, 1);
                              update("routingRules", next);
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline" /> Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">Device</span>
                            <select
                              value={rule.condition.device ?? ""}
                              onChange={(e) => {
                                const next = [...(form.routingRules ?? [])];
                                next[i] = {
                                  ...next[i],
                                  condition: {
                                    ...next[i].condition,
                                    device: (e.target.value || undefined) as any,
                                  },
                                };
                                update("routingRules", next);
                              }}
                              className={inputCls}
                            >
                              <option value="">Any</option>
                              <option value="mobile">Mobile</option>
                              <option value="desktop">Desktop</option>
                              <option value="tablet">Tablet</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">Country</span>
                            <input
                              value={rule.condition.country ?? ""}
                              onChange={(e) => {
                                const next = [...(form.routingRules ?? [])];
                                next[i] = {
                                  ...next[i],
                                  condition: {
                                    ...next[i].condition,
                                    country: e.target.value.toUpperCase() || undefined,
                                  },
                                };
                                update("routingRules", next);
                              }}
                              placeholder="e.g. US"
                              className={inputCls}
                              maxLength={2}
                            />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">Language</span>
                            <input
                              value={rule.condition.language ?? ""}
                              onChange={(e) => {
                                const next = [...(form.routingRules ?? [])];
                                next[i] = {
                                  ...next[i],
                                  condition: {
                                    ...next[i].condition,
                                    language: e.target.value || undefined,
                                  },
                                };
                                update("routingRules", next);
                              }}
                              placeholder="e.g. en, fr"
                              className={inputCls}
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground mb-1 block">Destination</span>
                          <input
                            value={rule.destination}
                            onChange={(e) => {
                              const next = [...(form.routingRules ?? [])];
                              next[i] = { ...next[i], destination: e.target.value };
                              update("routingRules", next);
                            }}
                            placeholder="https://..."
                            className={inputCls}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        update("routingRules", [
                          ...(form.routingRules ?? []),
                          {
                            condition: {},
                            destination: "",
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add rule
                    </button>
                  </div>
                )}

                {tab === "advanced" && (
                  <div className="space-y-5">
                    {/* Scheduling */}
                    <div>
                      <label className="inline-flex items-center gap-2 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={form.scheduleMode}
                          onChange={(e) => update("scheduleMode", e.target.checked)}
                          className="accent-[hsl(var(--primary))]"
                        />
                        <span className="text-sm font-medium">Schedule for later</span>
                      </label>
                      {form.scheduleMode && (
                        <DatePicker value={form.scheduledAt} onChange={(v) => update("scheduledAt", v)} minDate={new Date()} />
                      )}
                    </div>

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
                        <DatePicker value={form.expiresAt} onChange={(v) => update("expiresAt", v)} minDate={new Date()} />
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

                    {/* Deep linking */}
                    <div className="space-y-4 rounded-lg border border-border p-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.deepLinkEnabled}
                          onChange={(e) => update("deepLinkEnabled", e.target.checked)}
                          className="accent-[hsl(var(--primary))]"
                        />
                        <span className="text-sm font-semibold">Deep linking</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Opens your native app when the link is tapped on a mobile device.
                      </p>

                      {form.deepLinkEnabled && (
                        <div className="space-y-4 pl-2 border-l-2 border-primary/30">
                          <Field label="URI scheme" hint="Use {slug} or {destination} as placeholders">
                            <input
                              value={form.uriScheme}
                              onChange={(e) => update("uriScheme", e.target.value)}
                              placeholder="myapp://open/{slug}"
                              className={inputCls}
                            />
                          </Field>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="iOS App Store ID">
                              <input
                                value={form.iosAppStoreId}
                                onChange={(e) => update("iosAppStoreId", e.target.value)}
                                placeholder="id123456789"
                                className={inputCls}
                              />
                            </Field>
                            <Field label="Android Play Store ID">
                              <input
                                value={form.androidPlayStoreId}
                                onChange={(e) => update("androidPlayStoreId", e.target.value)}
                                placeholder="com.example.app"
                                className={inputCls}
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="iOS Bundle ID (Universal Links)">
                              <input
                                value={form.iosBundleId}
                                onChange={(e) => update("iosBundleId", e.target.value)}
                                placeholder="com.example.app"
                                className={inputCls}
                              />
                            </Field>
                            <Field label="Android Package Name (App Links)">
                              <input
                                value={form.androidPackageName}
                                onChange={(e) => update("androidPackageName", e.target.value)}
                                placeholder="com.example.app"
                                className={inputCls}
                              />
                            </Field>
                          </div>

                          <Field label="SHA-256 Cert Fingerprints (one per line)">
                            <textarea
                              value={form.sha256CertFingerprints.join("\n")}
                              onChange={(e) => update("sha256CertFingerprints", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                              rows={2}
                              placeholder="AA:BB:CC:..."
                              className={cn(inputCls, "h-auto resize-y")}
                            />
                          </Field>

                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={form.universalLinksEnabled}
                                onChange={(e) => update("universalLinksEnabled", e.target.checked)}
                                className="accent-[hsl(var(--primary))]"
                              />
                              Universal Links (iOS)
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={form.appLinksEnabled}
                                onChange={(e) => update("appLinksEnabled", e.target.checked)}
                                className="accent-[hsl(var(--primary))]"
                              />
                              App Links (Android)
                            </label>
                          </div>
                        </div>
                      )}
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

                {/* Live QR preview — uses the official main domain
                    (defaultDomain from getDefaultDomain()) and stamps
                    ?source=qr so the redirect handler can attribute the
                    click to this QR's analytics. */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5" />
                    QR preview
                  </p>
                  <div className="rounded-xl border border-border bg-background p-4">
                    {previewQrUrl ? (
                      <>
                        <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-lg bg-white p-3">
                          <QRCodeSVG
                            ref={qrSvgRef}
                            value={previewQrUrl}
                            size={196}
                            level="M"
                            marginSize={1}
                            fgColor="#0f172a"
                            bgColor="#ffffff"
                            style={{ width: "100%", height: "auto" }}
                          />
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="font-mono text-[11px] text-muted-foreground truncate text-center">
                            {previewShort}?source=qr
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => copy(previewShort + "?source=qr")}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
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
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadQr}
                              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Download className="h-3 w-3" />
                              SVG
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex aspect-square w-full max-w-[220px] mx-auto flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center">
                        <QrCode className="h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Add a slug to generate the QR
                        </p>
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

            <DialogFooter className="flex items-center justify-between gap-3 border-t border-border bg-background px-6 py-4">
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
              className="flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {submitting ? "Saving…" : prefill?.id ? "Save Changes" : "Create Link"}
            </button>
              </div>
            </DialogFooter>
      </DialogContent>
    </Dialog>
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

function FolderSelector({
  folders,
  selectedId,
  onSelect,
  onCreateFolder,
  workspaceId,
}: {
  folders: FolderOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateFolder?: (folder: FolderOption) => void;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, left: 0, width: 200 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedFolder = folders.find((f) => f.id === selectedId);

  const toggle = useCallback(() => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - r.top + 4, left: r.left, width: Math.max(r.width, 200) });
    }
    setOpen((v) => !v);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleCreate = async () => {
    if (!newFolderName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          workspaceId,
          color: null,
          icon: null,
          description: null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to create folder");
      }
      const data = await res.json();
      if (data.folder) {
        onSelect(data.folder.id);
        onCreateFolder?.(data.folder);
        toast.success(`Folder "${data.folder.name}" created`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create folder");
    } finally {
      setCreating(false);
      setNewFolderName("");
      setCreateOpen(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm transition-colors",
          "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20",
          selectedFolder ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedFolder ? (
            <>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md text-xs"
                style={{ backgroundColor: selectedFolder.color + "20", color: selectedFolder.color }}
              >
                <Folder className="h-3 w-3" />
              </span>
              <span>{selectedFolder.name}</span>
            </>
          ) : (
            <>
              <Folder className="h-4 w-4 opacity-50" />
              <span>No folder</span>
            </>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", left: pos.left + "px", bottom: pos.bottom + "px", width: pos.width + "px" }}
          className="z-[200] max-h-[260px] overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-xl"
        >
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
            onClick={() => { onSelect(null); setOpen(false); }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Folder className="h-3 w-3" />
            </span>
            <span className="flex-1 text-left">No folder</span>
            {selectedId === null && <CircleCheck className="h-4 w-4 text-primary" />}
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
              onClick={() => { onSelect(folder.id); setOpen(false); }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md text-xs"
                style={{ backgroundColor: folder.color + "20", color: folder.color }}
              >
                <Folder className="h-3 w-3" />
              </span>
              <span className="flex-1 text-left">{folder.name}</span>
              {selectedId === folder.id && <CircleCheck className="h-4 w-4 text-primary" />}
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted text-primary"
            onClick={() => setCreateOpen(true)}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Plus className="h-3 w-3" />
            </span>
            <span>Create new folder</span>
          </button>
        </div>,
        document.body
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your links
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4 pt-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => { setCreateOpen(false); setNewFolderName(""); }}
                className="flex-1 h-9 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newFolderName.trim() || creating}
                className="flex-1 h-9 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
