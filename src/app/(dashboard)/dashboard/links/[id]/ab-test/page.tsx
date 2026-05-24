"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Loader2, Plus, Trash2, Check, AlertTriangle, Trophy,
  BarChart2, Eye, ExternalLink, Info, Settings, ChevronDown,
} from "lucide-react";
import Link from "next/link";

interface ABVariantUI {
  id: string;
  destination: string;
  weight: number;
  label: string;
}

interface VariantStat {
  destination: string;
  label: string;
  clicks: number;
  conversionRate: number;
  relativeUplift: number;
  confidenceInterval: [number, number];
  pValue: number;
  isControl: boolean;
}

interface ABTestResultUI {
  winner: string | null;
  confidence: number;
  isSignificant: boolean;
  recommendation: string;
  variantStats: VariantStat[];
}

interface ABTestData {
  enabled: boolean;
  variants: ABVariantUI[];
  winner: string | null;
  significance: string | null;
  startedAt: string | null;
  endedAt: string | null;
  result: ABTestResultUI | null;
}

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export default function ABTestPage() {
  const params = useParams();
  const linkId = params.id as string;

  const [data, setData] = useState<ABTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [variants, setVariants] = useState<ABVariantUI[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minSampleSize] = useState(100);
  const [confidenceLevel] = useState(0.95);
  const [autoSelectWinner] = useState(true);
  const [testDurationDays] = useState(14);
  const [declaringWinner, setDeclaringWinner] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/links/${linkId}/ab-test`);
      const d = await res.json();
      setData(d);
      setEnabled(d.enabled ?? false);
      setVariants(d.variants && d.variants.length > 0 ? d.variants : []);
    } catch {
      setError("Failed to load A/B test data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (linkId) fetchData();
  }, [linkId]);

  function addVariant() {
    const letter = String.fromCharCode(65 + variants.length);
    setVariants([...variants, { id: generateId(), destination: "", weight: 1, label: `Variant ${letter}` }]);
  }

  function removeVariant(i: number) {
    if (variants.length <= 2) return;
    setVariants(variants.filter((_, j) => j !== i));
  }

  function updateVariant(i: number, field: keyof ABVariantUI, value: string | number) {
    const next = [...variants];
    (next[i] as any)[field] = value;
    setVariants(next);
  }

  const totalWeight = variants.reduce((s, v) => s + (v.weight || 0), 0);
  const weightValid = totalWeight === 100;

  async function saveConfig() {
    if (!weightValid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/links/${linkId}/ab-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          variants: variants.map((v) => ({
            id: v.id,
            destination: v.destination,
            weight: v.weight,
            label: v.label,
          })),
          minimumSampleSize: minSampleSize,
          confidenceLevel,
          autoSelectWinner,
          testDurationDays,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : "Failed to save");
        return;
      }
      await fetchData();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function stopTest() {
    if (!confirm("Stop this A/B test? Results will be archived.")) return;
    setSaving(true);
    try {
      await fetch(`/api/links/${linkId}/ab-test`, { method: "DELETE" });
      await fetchData();
    } catch {
      setError("Failed to stop test");
    } finally {
      setSaving(false);
    }
  }

  async function declareWinner(destination: string) {
    setDeclaringWinner(true);
    try {
      const res = await fetch(`/api/links/${linkId}/ab-test`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantDestination: destination }),
      });
      if (!res.ok) {
        setError("Failed to declare winner");
        return;
      }
      await fetchData();
    } catch {
      setError("Network error");
    } finally {
      setDeclaringWinner(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4 dark:bg-red-900/30">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Loader2 className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const result = data?.result;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/links/${linkId}/analytics`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">A/B Testing</h1>
          <p className="text-sm text-muted-foreground">Configure and monitor split URL experiments</p>
        </div>
        <Link
          href={`/dashboard/links/${linkId}/analytics`}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Back to analytics
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* SECTION 1: Configuration */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Configuration
          </h2>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>

        {enabled && (
          <div className="space-y-4">
            {/* Variant list */}
            <div className="space-y-3">
              {variants.map((v, i) => {
                const pct = totalWeight > 0 ? Math.round((v.weight / totalWeight) * 100) : 0;
                const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: colors[i % colors.length] }}
                        >
                          {v.label.charAt(0)}
                        </span>
                        {v.label}
                        {i === 0 && (
                          <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Control</span>
                        )}
                      </span>
                      {variants.length > 2 && (
                        <button type="button" onClick={() => removeVariant(i)} className="text-xs text-red-500 hover:underline">
                          <Trash2 className="h-3.5 w-3.5 inline" /> Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Label</span>
                        <input
                          value={v.label}
                          onChange={(e) => updateVariant(i, "label", e.target.value)}
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          maxLength={50}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-xs text-muted-foreground mb-1 block">Destination URL</span>
                        <input
                          value={v.destination}
                          onChange={(e) => updateVariant(i, "destination", e.target.value)}
                          placeholder="https://example.com/variant"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Weight</span>
                        <span className="text-xs font-medium text-foreground">{pct}%</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={v.weight}
                        onChange={(e) => updateVariant(i, "weight", Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-1">
                        {variants.map((x, j) => {
                          const w = totalWeight > 0 ? (x.weight / totalWeight) * 100 : 0;
                          const offset = variants.slice(0, j).reduce((s, y) => s + (totalWeight > 0 ? (y.weight / totalWeight) * 100 : 0), 0);
                          return (
                            <div
                              key={x.id}
                              className="h-full absolute top-0 rounded-full transition-all"
                              style={{
                                width: `${w}%`,
                                left: `${offset}%`,
                                backgroundColor: colors[j % colors.length],
                                position: "absolute",
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Weight distribution bar */}
            <div className="relative h-6 w-full rounded-full bg-muted overflow-hidden">
              {variants.map((v, i) => {
                const pct = totalWeight > 0 ? (v.weight / totalWeight) * 100 : 0;
                const offset = variants.slice(0, i).reduce((s, x) => s + (totalWeight > 0 ? (x.weight / totalWeight) * 100 : 0), 0);
                const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
                return (
                  <div
                    key={v.id}
                    className="h-full absolute top-0 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                    style={{ width: `${pct}%`, left: `${offset}%`, backgroundColor: colors[i % colors.length] }}
                  >
                    {pct > 10 ? `${Math.round(pct)}%` : ""}
                  </div>
                );
              })}
            </div>
            {!weightValid && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Weights must sum to 100 (currently {totalWeight})
              </p>
            )}

            <button
              type="button"
              onClick={addVariant}
              disabled={variants.length >= 5}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add variant ({variants.length}/5)
            </button>

            {/* Advanced settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-0" : "-rotate-90"}`} />
                Advanced settings
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Min. sample size</span>
                        <span className="text-sm font-medium text-foreground">{minSampleSize}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Confidence level</span>
                        <span className="text-sm font-medium text-foreground">{(confidenceLevel * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Auto-select winner</span>
                        <span className="text-sm font-medium text-foreground">{autoSelectWinner ? "Yes" : "No"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Test duration</span>
                        <span className="text-sm font-medium text-foreground">{testDurationDays} days</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={saveConfig}
                disabled={saving || !weightValid}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Saving..." : data?.enabled ? "Update Test" : "Launch Test"}
              </button>
              {data?.enabled && (
                <button
                  type="button"
                  onClick={stopTest}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Stop Test
                </button>
              )}
            </div>
          </div>
        )}

        {!enabled && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 mb-4 dark:bg-violet-900/30">
              <BarChart2 className="h-7 w-7 text-violet-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No A/B test active</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Toggle the switch above to create variants, split traffic, and measure which URL performs best.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: Live Results */}
      {data?.enabled && result && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-5">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            Live Results
          </h2>

          {/* Variant stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {result.variantStats.map((stat, i) => {
              const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
              const isWinner = result.winner === stat.destination;
              return (
                <motion.div
                  key={stat.destination}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border p-4 ${
                    stat.isControl
                      ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                      : isWinner
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
                        : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      >
                        {stat.label.charAt(0)}
                      </span>
                      {stat.label}
                    </span>
                    {stat.isControl && (
                      <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Control</span>
                    )}
                    {isWinner && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Trophy className="h-3 w-3" /> Winner
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-foreground tabular-nums">{stat.clicks}</div>
                      <div className="text-[10px] text-muted-foreground">Clicks</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground tabular-nums">
                        {(stat.conversionRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">Conv. rate</div>
                    </div>
                  </div>
                  {!stat.isControl && (
                    <div className={`mt-2 text-center text-xs font-medium ${stat.relativeUplift >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {stat.relativeUplift >= 0 ? "+" : ""}{stat.relativeUplift.toFixed(1)}% vs control
                    </div>
                  )}
                  <div className="mt-2 text-center text-[10px] text-muted-foreground">
                    CI: [{stat.confidenceInterval[0].toFixed(3)}, {stat.confidenceInterval[1].toFixed(3)}]
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Status banner */}
          {result.isSignificant && result.winner ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Winner found!
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">{result.recommendation}</p>
                </div>
                {data?.enabled && (
                  <button
                    type="button"
                    onClick={() => {
                      const winnerStat = result.variantStats.find((s) => s.destination === result.winner);
                      if (winnerStat) declareWinner(winnerStat.destination);
                    }}
                    disabled={declaringWinner}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {declaringWinner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                    Declare Winner
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Test in progress
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{result.recommendation}</p>
              {data?.startedAt && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Started: {new Date(data.startedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Declare winner manually */}
          {data?.enabled && !result.isSignificant && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Manually declare a winner:</p>
              <div className="flex flex-wrap gap-2">
                {result.variantStats.filter((s) => !s.isControl).map((stat) => (
                  <button
                    key={stat.destination}
                    type="button"
                    onClick={() => declareWinner(stat.destination)}
                    disabled={declaringWinner}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {declaringWinner ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3 text-amber-500" />}
                    {stat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Test ended / results archived */}
      {!data?.enabled && data?.winner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
          <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5" />
            Test Complete
          </h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Winner: <strong>{data.winner}</strong>
          </p>
          {data.significance && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
              Significance: {(Number(data.significance) * 100).toFixed(1)}%
            </p>
          )}
          {data.endedAt && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
              Ended: {new Date(data.endedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
