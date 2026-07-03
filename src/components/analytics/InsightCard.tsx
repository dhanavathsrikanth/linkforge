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
    border: "border-border-success",
    bg: "bg-bg-success",
    iconBg: "bg-bg-success",
    iconColor: "text-text-success",
  },
  trend: {
    border: "border-border-brand",
    bg: "bg-bg-brand-primary",
    iconBg: "bg-bg-brand-secondary",
    iconColor: "text-text-brand-tertiary",
  },
  warning: {
    border: "border-border-warning",
    bg: "bg-bg-warning",
    iconBg: "bg-bg-warning",
    iconColor: "text-text-warning",
  },
  recommendation: {
    border: "border-border-brand",
    bg: "bg-bg-brand-primary",
    iconBg: "bg-bg-brand-secondary",
    iconColor: "text-text-brand-tertiary",
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
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            {metric && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.bg} ${styles.iconColor}`}>
                {metric}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
