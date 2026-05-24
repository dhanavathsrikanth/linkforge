"use client";

import { cn } from "@/lib/utils";

interface ColorPickerProps {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ colors, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
            value === color
              ? "border-foreground scale-110"
              : "border-transparent hover:border-muted-foreground/30"
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {value === color && (
            <svg
              className="w-4 h-4 mx-auto text-white drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
