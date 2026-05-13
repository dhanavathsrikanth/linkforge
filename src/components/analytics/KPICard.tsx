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

export function KPICard({ label, value, suffix, prefix, growth, subValue, isLoading }: KPICardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  const isPositive = growth !== undefined && growth >= 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#DEDCFF]">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className="text-3xl font-bold text-slate-950">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </h3>
        {growth !== undefined && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      {subValue && <p className="mt-1 text-sm text-slate-500">{subValue}</p>}
    </div>
  );
}