"use client";

import {
  TrendingUp, TrendingDown, Star, Clock, Smartphone, Monitor,
  Globe, Link2, Lightbulb, AlertTriangle,
} from "lucide-react";

interface InsightCardProps {
  type: "opportunity" | "trend" | "warning" | "recommendation";
  title: string;
  description: string;
  metric?: string;
  icon: string;
}

const iconMap: Record<string, React.ElementType> = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  star: Star,
  clock: Clock,
  smartphone: Smartphone,
  monitor: Monitor,
  globe: Globe,
  link: Link2,
};

const typeStyles: Record<string, { border: string; bg: string; iconBg: string; iconColor: string }> = {
  opportunity: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  trend: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  recommendation: {
    border: "border-violet-200",
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
};

export function InsightCard({ type, title, description, metric, icon }: InsightCardProps) {
  const styles = typeStyles[type] || typeStyles.recommendation;
  const IconComponent = iconMap[icon] || Lightbulb;

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4 transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconColor}`}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {metric && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.bg.replace("border-", "bg-")} ${styles.iconColor}`}>
                {metric}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
