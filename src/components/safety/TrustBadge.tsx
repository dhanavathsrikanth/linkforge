import { ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle } from "lucide-react";

export type TrustBand = "unknown" | "low" | "medium" | "high" | "verified";

const COPY: Record<TrustBand, { label: string; tone: string }> = {
  unknown: { label: "Unscored", tone: "border-stone-200 bg-stone-50 text-stone-600" },
  low: { label: "Risky", tone: "border-red-200 bg-red-50 text-red-700" },
  medium: { label: "Caution", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  high: { label: "Safe", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  verified: { label: "Verified safe", tone: "border-blue-200 bg-blue-50 text-blue-700" },
};

const ICON: Record<TrustBand, React.ComponentType<{ className?: string }>> = {
  unknown: ShieldQuestion,
  low: ShieldAlert,
  medium: AlertTriangle,
  high: ShieldCheck,
  verified: ShieldCheck,
};

/**
 * Reusable Trust Badge (Req 14).
 *
 * Variants:
 *   - size: "sm" (badge) | "md" (default chip) | "lg" (hero)
 *   - showScore: include the numeric score (default true)
 *
 * When `score` is null OR band is "unknown", renders the unscored variant
 * without a number.
 */
export function TrustBadge({
  score,
  band,
  size = "md",
  showScore = true,
  className = "",
}: {
  score: number | null;
  band: TrustBand;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}) {
  const safeBand: TrustBand = score === null && band !== "unknown" ? "unknown" : band;
  const copy = COPY[safeBand];
  const Icon = ICON[safeBand];

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1 rounded-full"
      : size === "lg"
      ? "text-sm px-3 py-1.5 gap-2 rounded-xl"
      : "text-xs px-2.5 py-1 gap-1.5 rounded-full";

  const iconClass = size === "lg" ? "h-4 w-4" : "h-3 w-3";

  return (
    <span
      className={`inline-flex items-center font-semibold border ${copy.tone} ${sizeClasses} ${className}`}
      title={`Trust score: ${score ?? "?"}/100 — ${copy.label.toLowerCase()}`}
    >
      <Icon className={iconClass} />
      <span>{copy.label}</span>
      {showScore && safeBand !== "unknown" && score !== null && (
        <span className="font-mono opacity-80 tabular-nums">· {score}</span>
      )}
    </span>
  );
}
