"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Table,
  Link2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/providers/WorkspaceProvider";

type InputLink = {
  destination: string;
  slug: string;
  title: string;
  tags: string[];
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

type Result = {
  index: number;
  success: boolean;
  error?: string;
  link?: {
    id: string;
    slug: string;
    destination: string;
  };
};

type Props = {
  workspaceId: string;
  defaultDomain?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (link: any) => void;
};

type Tab = "paste" | "csv" | "review" | "results";

const commonUtmFields = [
  { key: "utmSource", label: "utm_source", hint: "newsletter, facebook" },
  { key: "utmMedium", label: "utm_medium", hint: "email, cpc" },
  { key: "utmCampaign", label: "utm_campaign", hint: "spring_sale" },
  { key: "utmTerm", label: "utm_term", hint: "running+shoes" },
  { key: "utmContent", label: "utm_content", hint: "logolink" },
] as const;

function generateSlug(): string {
  return Math.random().toString(36).slice(2, 8);
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field.trim());
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        current.push(field.trim());
        if (current.some((c) => c.length > 0)) rows.push(current);
        current = [];
        field = "";
        if (ch === "\r") i++;
      } else if (ch === "\r") {
        current.push(field.trim());
        if (current.some((c) => c.length > 0)) rows.push(current);
        current = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }

  if (field.trim() || current.length > 0) {
    current.push(field.trim());
    if (current.some((c) => c.length > 0)) rows.push(current);
  }

  return rows;
}

const columnPatterns: Record<keyof InputLink, string[]> = {
  destination: ["destination", "url", "link", "target", "long url", "longurl", "redirect", "final url"],
  slug: ["slug", "short url", "shorturl", "alias", "custom slug", "code", "key"],
  title: ["title", "name", "label", "campaign name"],
  tags: ["tags", "tag", "labels", "category"],
  utmSource: ["utm_source", "source", "utm source", "utmSource"],
  utmMedium: ["utm_medium", "medium", "utm medium", "utmMedium"],
  utmCampaign: ["utm_campaign", "campaign", "utm campaign", "utmCampaign"],
  utmTerm: ["utm_term", "term", "utm term", "utmTerm"],
  utmContent: ["utm_content", "content", "utm content", "utmContent"],
};

function detectColumn(headers: string[]): Partial<Record<keyof InputLink, number>> {
  const mapping: Partial<Record<keyof InputLink, number>> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());

  for (const [field, patterns] of Object.entries(columnPatterns)) {
    const idx = lower.findIndex((h) => patterns.includes(h));
    if (idx !== -1) mapping[field as keyof InputLink] = idx;
  }

  return mapping;
}

function parsePastedText(text: string): Partial<InputLink>[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    const dest = parts[0];
    const slug = parts.length > 1 ? parts[1] : "";
    const title = parts.length > 2 ? parts[2] : "";

    if (!dest) return { destination: "" };

    const normalized = /^https?:\/\//i.test(dest) ? dest : `https://${dest}`;
    return {
      destination: normalized,
      slug: slug || generateSlug(),
      title: title || "",
    };
  }).filter((l) => l.destination);
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function getFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BulkCreateSheet({
  workspaceId,
  defaultDomain,
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const { workspace } = useWorkspace();
  const plan = workspace?.plan || "free";

  const [tab, setTab] = useState<Tab>("paste");
  const [pastedText, setPastedText] = useState("");
  const [commonTags, setCommonTags] = useState("");
  const [commonUtm, setCommonUtm] = useState({
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Partial<Record<keyof InputLink, number>>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedLinks, setParsedLinks] = useState<InputLink[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const loadedLinks = useMemo(() => {
    if (tab === "paste") return parsedLinks;
    if (tab === "csv") return parsedLinks;
    return parsedLinks;
  }, [tab, parsedLinks]);

  function reset() {
    setTab("paste");
    setPastedText("");
    setCommonTags("");
    setCommonUtm({ utmSource: "", utmMedium: "", utmCampaign: "", utmTerm: "", utmContent: "" });
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMap({});
    setParsedLinks([]);
    setSubmitting(false);
    setResults([]);
    setError(null);
    setShowUpgrade(false);
  }

  useEffect(() => {
    if (open) reset();
  }, [open]);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setError(null);
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setError("CSV must have a header row and at least one data row");
        return;
      }
      const headers = rows[0];
      const data = rows.slice(1).filter((r) => r.some((c) => c.trim()));

      setCsvHeaders(headers);
      setCsvRows(data);

      const detected = detectColumn(headers);

      const destIdx = detected.destination;
      if (destIdx === undefined) {
        detected.destination = 0;
      }

      setColumnMap(detected);
    };
    reader.readAsText(file);
  }

  function applyColumnMap() {
    const links: InputLink[] = csvRows.map((row) => {
      const get = (field: keyof InputLink): string => {
        const idx = columnMap[field];
        return idx !== undefined && idx < row.length ? row[idx].trim() : "";
      };

      let dest = get("destination");
      if (dest && !/^https?:\/\//i.test(dest)) {
        dest = `https://${dest}`;
      }

      return {
        destination: dest,
        slug: get("slug") || generateSlug(),
        title: get("title"),
        tags: get("tags")
          ? get("tags").split(";").map((t) => t.trim()).filter(Boolean)
          : [],
        utmSource: get("utmSource") || commonUtm.utmSource,
        utmMedium: get("utmMedium") || commonUtm.utmMedium,
        utmCampaign: get("utmCampaign") || commonUtm.utmCampaign,
        utmTerm: get("utmTerm") || commonUtm.utmTerm,
        utmContent: get("utmContent") || commonUtm.utmContent,
      };
    }).filter((l) => l.destination && isValidUrl(l.destination));

    setParsedLinks(links);
    setTab("review");
  }

  function handleReviewPasted() {
    const raw = parsePastedText(pastedText);
    if (raw.length === 0) {
      setError("Paste at least one URL");
      return;
    }

    const tags = commonTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const links: InputLink[] = raw.map((r) => ({
      destination: r.destination || "",
      slug: r.slug || generateSlug(),
      title: r.title || "",
      tags: tags.slice(),
      utmSource: commonUtm.utmSource,
      utmMedium: commonUtm.utmMedium,
      utmCampaign: commonUtm.utmCampaign,
      utmTerm: commonUtm.utmTerm,
      utmContent: commonUtm.utmContent,
    })).filter((l) => l.destination && isValidUrl(l.destination));

    if (links.length === 0) {
      setError("No valid URLs found. Make sure each line contains a valid URL.");
      return;
    }

    setParsedLinks(links);
    setTab("review");
  }

  async function handleCreate() {
    if (loadedLinks.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/links/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          links: loadedLinks.map((l) => ({
            destination: l.destination,
            slug: l.slug,
            title: l.title || undefined,
            tags: l.tags.length > 0 ? l.tags : undefined,
            utmSource: l.utmSource || undefined,
            utmMedium: l.utmMedium || undefined,
            utmCampaign: l.utmCampaign || undefined,
            utmTerm: l.utmTerm || undefined,
            utmContent: l.utmContent || undefined,
          })),
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setShowUpgrade(true);
        setSubmitting(false);
        return;
      }

      setResults(data.results || []);
      setTab("results");

      if (data.results) {
        const successes = data.results.filter((r: Result) => r.success);
        if (successes.length > 0 && onCreated) {
          successes.forEach((r: Result) => onCreated(r.link));
        }
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    reset();
    onOpenChange(false);
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bulk-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          <motion.aside
            key="bulk-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[960px] flex-col bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {/* ── Header ──────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Bulk Create Links</h2>
                <p className="text-xs text-muted-foreground">
                  Create up to 500 links at once
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

            {/* ── Body ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {/* Stepped tabs */}
              {tab !== "results" && !showUpgrade && (
                <div className="flex items-center gap-1 border-b border-border px-6">
                  {[
                    { key: "paste" as Tab, label: "1. Enter Links" },
                    { key: "csv" as Tab, label: "2. CSV Upload" },
                    ...(parsedLinks.length > 0 ? [{ key: "review" as Tab, label: "3. Review & Create" }] : []),
                  ].map((t) => {
                    const active = tab === t.key;
                    const isComplete = t.key === "review" && parsedLinks.length > 0;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          if (t.key === "review" && parsedLinks.length > 0) setTab("review");
                          if (t.key === "paste") setTab("paste");
                          if (t.key === "csv") setTab("csv");
                        }}
                        className={cn(
                          "relative px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "text-foreground"
                            : isComplete
                              ? "text-emerald-600"
                              : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isComplete && t.key === "review" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5" />
                            {t.label}
                          </span>
                        ) : (
                          t.label
                        )}
                        {active && (
                          <motion.span
                            layoutId="bulk-tab"
                            className="absolute inset-x-3 -bottom-px h-0.5 rounded bg-primary"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Upgrade Prompt ─────────────────────────────── */}
              {showUpgrade && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 mb-5">
                    <Plus className="h-7 w-7 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Upgrade to create in bulk</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Bulk link creation is available on the <strong>Growth</strong> plan and above.
                    Upgrade to create hundreds of links at once.
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetAndClose}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <a
                      href="/dashboard/billings"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      Upgrade now
                    </a>
                  </div>
                </div>
              )}

              {/* ── Tab: Paste URLs ────────────────────────────── */}
              {tab === "paste" && !showUpgrade && (
                <div className="space-y-5 px-6 py-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        URLs
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        One per line
                      </span>
                    </div>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={
                        "https://example.com/landing-page\n" +
                        "https://example.com/product\n" +
                        "https://example.com/blog/post"
                      }
                      className="h-44 w-full rounded-lg border border-border bg-background p-3 text-sm font-mono text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 resize-y"
                      spellCheck={false}
                    />
                  </div>

                  {/* Common settings */}
                  <details className="group rounded-lg border border-border">
                    <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 rounded-lg [&::-webkit-details-marker]:hidden">
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                      Apply common settings to all links
                    </summary>
                    <div className="border-t border-border px-4 py-4 space-y-4">
                      <div>
                        <span className="text-xs font-semibold text-foreground mb-1.5 block">Tags</span>
                        <input
                          value={commonTags}
                          onChange={(e) => setCommonTags(e.target.value)}
                          placeholder="promo, summer, sales"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-foreground mb-2 block">UTM Parameters</span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {commonUtmFields.map(({ key, label, hint }) => (
                            <div key={key}>
                              <span className="text-xs text-muted-foreground mb-1 block">{label}</span>
                              <input
                                value={commonUtm[key as keyof typeof commonUtm]}
                                onChange={(e) => setCommonUtm((prev) => ({ ...prev, [key]: e.target.value }))}
                                placeholder={hint}
                                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>

                  {error && (
                    <p className="text-xs font-medium text-red-500">{error}</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleReviewPasted}
                      disabled={!pastedText.trim()}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" />
                      Review {pastedText.trim().split("\n").filter(Boolean).length > 0 && `(${pastedText.trim().split("\n").filter(Boolean).length})`}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Tab: CSV Upload ────────────────────────────── */}
              {tab === "csv" && !showUpgrade && (
                <div className="space-y-5 px-6 py-5">
                  {/* File upload zone */}
                  {!csvFile && (
                    <div>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors",
                          dragOver
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Drop a CSV file here, or click to browse
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          CSV must have a header row
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          Accepted headers:
                        </span>
                        {["destination", "slug", "title", "tags", "utm_source", "utm_medium", "utm_campaign"].map((h) => (
                          <code key={h} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground/80">
                            {h}
                          </code>
                        ))}
                        <span className="text-xs text-muted-foreground ml-auto">
                          Only <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">destination</code> is required
                        </span>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const headers = ["destination", "slug", "title", "tags", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
                            const sample = [
                              "https://example.com/page-1,my-slug-1,Page 1,promo;summer,newsletter,email,spring_sale,running+shoes,logolink",
                              "https://example.com/page-2,,Page 2,social,newsletter,email,,,",
                            ];
                            const csv = [headers.join(","), ...sample].join("\n");
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "linkforge-bulk-template.csv";
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download template CSV
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File loaded — column mapping */}
                  {csvFile && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{csvFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getFileSize(csvFile.size)} &middot; {csvRows.length} rows &middot; {csvHeaders.length} columns
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCsvFile(null); setCsvHeaders([]); setCsvRows([]); setColumnMap({}); }}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-foreground mb-2 block">
                          Map CSV columns to link fields
                        </span>
                        <div className="space-y-2">
                          {(["destination", "slug", "title", "tags", "utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const).map((field) => (
                            <div key={field} className="flex items-center gap-3">
                              <span className="w-28 text-xs font-medium text-foreground shrink-0">
                                {field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                              </span>
                              <select
                                value={columnMap[field] ?? ""}
                                onChange={(e) =>
                                  setColumnMap((prev) => {
                                    const next = { ...prev };
                                    const val = e.target.value;
                                    if (val === "") {
                                      delete next[field];
                                    } else {
                                      next[field] = Number(val);
                                    }
                                    return next;
                                  })
                                }
                                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="">— Skip —</option>
                                {csvHeaders.map((h, i) => (
                                  <option key={i} value={i}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preview first 5 rows */}
                      <div>
                        <span className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <Table className="h-3.5 w-3.5" />
                          Preview (first 5 rows)
                        </span>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-muted/30">
                                {csvHeaders.map((h, i) => (
                                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {csvRows.slice(0, 5).map((row, ri) => (
                                <tr key={ri} className="border-b border-border last:border-0">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {error && (
                        <p className="text-xs font-medium text-red-500">{error}</p>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={applyColumnMap}
                          disabled={columnMap.destination === undefined && columnMap.destination === undefined}
                          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                        >
                          <FileText className="h-4 w-4" />
                          Review {csvRows.length > 0 && `(${csvRows.length})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Review & Create ───────────────────────── */}
              {tab === "review" && !showUpgrade && (
                <div className="space-y-4 px-6 py-5">
                  {parsedLinks.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5" />
                          {parsedLinks.length} link{parsedLinks.length !== 1 ? "s" : ""} to create
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTab("paste");
                            setParsedLinks([]);
                          }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit input
                        </button>
                      </div>

                      {/* Scrollable table */}
                      <div className="overflow-x-auto rounded-lg border border-border max-h-[400px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b border-border">
                              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground">#</th>
                              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground">Destination</th>
                              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground">Slug</th>
                              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground hidden sm:table-cell">Title</th>
                              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground hidden lg:table-cell">UTMs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedLinks.map((link, i) => (
                              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                <td className="max-w-[280px] truncate px-3 py-2 font-medium text-foreground">
                                  {link.destination}
                                </td>
                                <td className="px-3 py-2 font-mono text-foreground">
                                  {link.slug}
                                </td>
                                <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground hidden sm:table-cell">
                                  {link.title || "—"}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">
                                  {link.utmSource || link.utmMedium || link.utmCampaign
                                    ? [link.utmSource, link.utmMedium, link.utmCampaign].filter(Boolean).join(", ")
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {error && (
                    <p className="text-xs font-medium text-red-500">{error}</p>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Up to 500 links per batch. Slugs are auto-generated if not provided.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setTab("paste"); setParsedLinks([]); }}
                        className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={submitting || parsedLinks.length === 0}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating {parsedLinks.length} links...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Create {parsedLinks.length} link{parsedLinks.length !== 1 ? "s" : ""}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Results ───────────────────────────────── */}
              {tab === "results" && (
                <div className="space-y-5 px-6 py-5">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl mb-4",
                      failCount === 0 ? "bg-emerald-100" : "bg-amber-100",
                    )}>
                      {failCount === 0 ? (
                        <Check className="h-7 w-7 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-7 w-7 text-amber-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {failCount === 0
                        ? "All links created"
                        : `${successCount} of ${results.length} links created`}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {successCount} succeeded{failCount > 0 ? `, ${failCount} failed` : ""}
                    </p>
                  </div>

                  {failCount > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="border-b border-border bg-muted/30 px-4 py-2">
                        <span className="text-xs font-semibold text-foreground">Failed links</span>
                      </div>
                      <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
                        {results.filter((r) => !r.success).map((r) => (
                          <div key={r.index} className="px-4 py-2.5">
                            <p className="text-xs font-medium text-foreground">
                              #{r.index + 1}: {loadedLinks[r.index]?.destination || "Unknown"}
                            </p>
                            <p className="text-[11px] text-red-500 mt-0.5">{r.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                      {successCount > 0 && (
                        <a
                          href="/dashboard/links"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          View all links
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={resetAndClose}
                      className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer (only for input tabs) ────────────────── */}
            {(tab === "paste" || tab === "csv") && !showUpgrade && (
              <div className="flex items-center justify-between gap-3 border-t border-border bg-background px-6 py-4">
                <div className="min-h-5 text-xs">
                  {tab === "csv" && csvFile && (
                    <span className="text-muted-foreground">
                      {csvRows.length} rows detected in CSV
                    </span>
                  )}
                  {tab === "paste" && pastedText.trim() && (
                    <span className="text-muted-foreground">
                      {pastedText.trim().split("\n").filter(Boolean).length} URLs detected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
