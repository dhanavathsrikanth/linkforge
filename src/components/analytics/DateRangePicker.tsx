"use client";

import { useState } from "react";
import { DateRange } from "@/hooks/analytics";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange, from?: string, to?: string) => void;
}

const RANGES = [
  { value: "7d" as DateRange, label: "7 days" },
  { value: "30d" as DateRange, label: "30 days" },
  { value: "90d" as DateRange, label: "90 days" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange("custom", customFrom, customTo);
      setShowCustom(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-lg bg-slate-100 p-1">
        {RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              value === range.value || (value === "custom" && !RANGES.find(r => r.value === value))
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {range.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            showCustom
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          />
          <button
            onClick={handleCustomApply}
            className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}