"use client";

import { useEffect, useState, useRef } from "react";

interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  growth?: number;
  subValue?: string;
  isLoading?: boolean;
  compact?: boolean;
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export function KPICard({ label, value, suffix, prefix, growth, subValue, isLoading, compact }: KPICardProps) {
  if (isLoading) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-5"}`}>
        <div className={`animate-pulse rounded bg-slate-200 ${compact ? "h-3 w-16" : "h-4 w-24"}`} />
        <div className={`mt-2 animate-pulse rounded bg-slate-200 ${compact ? "h-6 w-20" : "mt-3 h-8 w-32"}`} />
      </div>
    );
  }

  const isPositive = growth !== undefined && growth >= 0;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-[#DEDCFF] ${compact ? "p-3" : "p-5"}`}>
      <p className={`font-medium uppercase tracking-wider text-slate-500 ${compact ? "text-[10px]" : "text-xs"}`}>{label}</p>
      <div className="mt-1 flex items-baseline justify-between">
        <h3 className={`font-bold text-slate-950 ${compact ? "text-xl" : "text-3xl"}`}>
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </h3>
        {growth !== undefined && (
          <span
            className={`flex items-center gap-1 font-medium ${compact ? "text-xs" : "text-sm"} ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <svg className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      {subValue && <p className={`text-slate-500 ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>{subValue}</p>}
    </div>
  );
}