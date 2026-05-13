"use client";

import { useRef } from "react";
import { User, Upload } from "lucide-react";

const BG_COLORS = [
  "#6366f1", "#ec4899", "#f97316", "#22c55e",
  "#14b8a6", "#3b82f6", "#a855f7", "#ef4444",
  "#0ea5e9", "#f59e0b",
];

interface ProfileSectionProps {
  displayName: string;
  bio: string;
  avatarInitials: string;
  avatarBgColor: string;
  onUpdate: (patch: {
    displayName?: string;
    bio?: string;
    avatarInitials?: string;
    avatarBgColor?: string;
  }) => void;
}

export function ProfileSection({
  displayName,
  bio,
  avatarInitials,
  avatarBgColor,
  onUpdate,
}: ProfileSectionProps) {
  const bioLen = bio.length;

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 border-2 border-white/20 shadow-lg"
          style={{ backgroundColor: avatarBgColor }}
        >
          {avatarInitials || <User className="w-7 h-7" />}
        </div>

        <div className="flex-1 space-y-2">
          {/* Initials input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Initials (shown on avatar)
            </label>
            <input
              type="text"
              value={avatarInitials}
              onChange={(e) =>
                onUpdate({ avatarInitials: e.target.value.slice(0, 3).toUpperCase() })
              }
              maxLength={3}
              className="w-24 px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-center font-bold tracking-wider"
              placeholder="AB"
            />
          </div>

          {/* Color picker dots */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Avatar color
            </label>
            <div className="flex gap-2 flex-wrap">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate({ avatarBgColor: c })}
                  className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: avatarBgColor === c ? "white" : "transparent",
                    boxShadow: avatarBgColor === c ? `0 0 0 2px ${c}` : "none",
                  }}
                />
              ))}
              {/* Custom color */}
              <label className="w-6 h-6 rounded-full border-2 border-dashed border-border cursor-pointer flex items-center justify-center hover:border-primary transition-colors" title="Custom color">
                <Upload className="w-3 h-3 text-muted-foreground" />
                <input
                  type="color"
                  value={avatarBgColor}
                  onChange={(e) => onUpdate({ avatarBgColor: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onUpdate({ displayName: e.target.value })}
          placeholder="Your name or brand"
          maxLength={80}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Bio */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bio
          </label>
          <span
            className={`text-xs font-medium tabular-nums ${
              bioLen > 145 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {bioLen}/160
          </span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => onUpdate({ bio: e.target.value.slice(0, 160) })}
          placeholder="A short bio or tagline..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50 resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
