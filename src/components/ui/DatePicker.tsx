"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
  addYears,
  subYears,
  setMonth,
  parseISO,
} from "date-fns";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function CalendarGrid({
  viewing,
  selected,
  minDate,
  onSelect,
}: {
  viewing: Date;
  selected: Date | null;
  minDate?: Date;
  onSelect: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewing)),
    end: endOfWeek(endOfMonth(viewing)),
  });

  return (
    <div className="grid grid-cols-7 gap-0.5">
      {DAYS.map((d) => (
        <div key={d} className="flex h-7 w-7 items-center justify-center text-[10px] font-medium text-muted-foreground">
          {d}
        </div>
      ))}
      {days.map((day, i) => {
        const outside = !isSameMonth(day, viewing);
        const active = selected && isSameDay(day, selected);
        const disabled = minDate ? isBefore(startOfDay(day), startOfDay(minDate)) : false;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onSelect(day)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors",
              outside && "text-muted-foreground/30",
              disabled && "text-muted-foreground/20 cursor-not-allowed",
              active && !disabled
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-foreground hover:bg-accent",
              !outside && !active && !disabled && "hover:bg-accent"
            )}
          >
            {format(day, "d")}
          </button>
        );
      })}
    </div>
  );
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  minDate?: Date;
};

export function DatePicker({ value, onChange, className, minDate }: Props) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(() => {
    try { return value ? parseISO(value) : minDate || new Date(); }
    catch { return minDate || new Date(); }
  });
  const [pickerMode, setPickerMode] = useState<"days" | "months">("days");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = (() => {
    try { return value ? parseISO(value) : null; }
    catch { return null; }
  })();

  const datePart = selectedDate ? format(selectedDate, "MMM d, yyyy") : "";
  const timePart = (() => {
    try { return value ? format(parseISO(value), "HH:mm") : ""; }
    catch { return ""; }
  })();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickerMode("days");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectDay = useCallback((day: Date) => {
    const existingTime = (() => {
      try { return value ? format(parseISO(value), "HH:mm") : ""; }
      catch { return ""; }
    })();
    const merged = existingTime ? `${format(day, "yyyy-MM-dd")}T${existingTime}` : format(day, "yyyy-MM-dd'T'HH:mm");
    onChange(merged);
    setOpen(false);
  }, [value, onChange]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setPickerMode("days"); }}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={cn("flex-1 text-left", !datePart && "text-muted-foreground")}>
          {datePart || "Pick a date"}
        </span>
        {timePart && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="font-mono text-xs text-muted-foreground">{timePart}</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-xl border border-border bg-popover p-3 shadow-lg">
          {pickerMode === "days" ? (
            <>
              {/* Day view header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => { setViewing(subMonths(viewing, 1)); }}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerMode("months")}
                    className="px-2 h-7 text-sm font-semibold rounded-md hover:bg-accent transition-colors"
                  >
                    {format(viewing, "MMMM yyyy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewing(addMonths(viewing, 1)); }}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setViewing(addYears(viewing, 1)); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
                  title="Next year"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-ml-1"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              <CalendarGrid viewing={viewing} selected={selectedDate} minDate={minDate} onSelect={selectDay} />

              {/* Time input */}
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <input
                  type="time"
                  value={timePart}
                  onChange={(e) => {
                    if (selectedDate) {
                      const d = format(selectedDate, "yyyy-MM-dd");
                      onChange(`${d}T${e.target.value}`);
                    }
                  }}
                  className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </>
          ) : (
            <>
              {/* Month/year picker header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewing(subYears(viewing, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMode("days")}
                  className="px-2 h-7 text-sm font-semibold rounded-md hover:bg-accent transition-colors"
                >
                  {format(viewing, "yyyy")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewing(addYears(viewing, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-4 gap-1">
                {MONTHS.map((m, i) => {
                  const d = setMonth(viewing, i);
                  const active = selectedDate && isSameMonth(d, selectedDate);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setViewing(d); setPickerMode("days"); }}
                      className={cn(
                        "rounded-md py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
