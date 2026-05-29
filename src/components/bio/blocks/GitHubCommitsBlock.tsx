"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { cn } from "@/lib/utils";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { GitHubConfig } from "@/components/bio/forms/GitHubForm";

// ─── GitHub mark (lucide-react v1 doesn't ship a Github icon) ─────────────────

function GithubLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 98 96"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
        fill="currentColor"
      />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function readableText(bg: string): string {
  const rgb = hexToRgb(bg);
  if (!rgb) return "#FFFFFF";
  const linear = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const c = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  return linear(rgb) > 0.5 ? "#0F172A" : "#FFFFFF";
}
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Data fetching ────────────────────────────────────────────────────────────

interface BlockData {
  /** Headline number for the chosen metric */
  value: number;
  /** % change vs the previous period (only for monthly commits) */
  delta: number | null;
  /** Profile bits used for the avatar / handle row */
  profile: {
    avatarUrl: string;
    name: string;
    handle: string;
  } | null;
}

async function fetchProfile(username: string) {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`profile ${res.status}`);
  return (await res.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
    public_repos: number;
    followers: number;
  };
}

async function fetchCommitCount(username: string, sinceISO: string): Promise<number> {
  // The Search API limits authoring date queries to ~10 chars (YYYY-MM-DD).
  const date = sinceISO.slice(0, 10);
  const q = `author:${username}+committer-date:>=${date}`;
  const res = await fetch(`https://api.github.com/search/commits?q=${q}`, {
    headers: { Accept: "application/vnd.github.cloak-preview" },
  });
  if (!res.ok) throw new Error(`commits ${res.status}`);
  const data = (await res.json()) as { total_count?: number };
  return data.total_count ?? 0;
}

async function fetchData(
  username: string,
  metric: NonNullable<GitHubConfig["metric"]>,
  showDelta: boolean
): Promise<BlockData> {
  const profile = await fetchProfile(username).catch(() => null);

  if (metric === "public-repos") {
    return {
      value: profile?.public_repos ?? 0,
      delta: null,
      profile: profile && {
        avatarUrl: profile.avatar_url,
        name: profile.name ?? profile.login,
        handle: profile.login,
      },
    };
  }
  if (metric === "followers") {
    return {
      value: profile?.followers ?? 0,
      delta: null,
      profile: profile && {
        avatarUrl: profile.avatar_url,
        name: profile.name ?? profile.login,
        handle: profile.login,
      },
    };
  }

  // Time-windowed commit counts
  const now = new Date();
  let thisStart: Date;
  let prevStart: Date | null = null;
  let prevEnd: Date | null = null;
  if (metric === "commits-month") {
    thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    // commits-year
    thisStart = new Date(now.getFullYear(), 0, 1);
  }

  const value = await fetchCommitCount(username, thisStart.toISOString()).catch(() => 0);
  let delta: number | null = null;
  if (showDelta && prevStart && prevEnd) {
    try {
      // Commits in the previous month: count >= prevStart minus count >= thisStart
      const prevAndForward = await fetchCommitCount(username, prevStart.toISOString());
      const prevOnly = Math.max(0, prevAndForward - value);
      if (prevOnly > 0) delta = Math.round(((value - prevOnly) / prevOnly) * 100);
    } catch {
      delta = null;
    }
  }

  return {
    value,
    delta,
    profile: profile && {
      avatarUrl: profile.avatar_url,
      name: profile.name ?? profile.login,
      handle: profile.login,
    },
  };
}

// ─── Block ────────────────────────────────────────────────────────────────────

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

const METRIC_LABEL: Record<NonNullable<GitHubConfig["metric"]>, string> = {
  "commits-month": "Commits this month",
  "commits-year": "Commits this year",
  "public-repos": "Public repos",
  followers: "Followers",
};

export function GitHubCommitsBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as GitHubConfig;
  const {
    githubUsername,
    metric = "commits-month",
    showDelta = true,
    variant = "default",
    accentColor = "#0F172A",
  } = config;

  const [data, setData] = useState<BlockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!githubUsername) {
      setData(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchData(githubUsername, metric, showDelta && metric === "commits-month")
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [githubUsername, metric, showDelta]);

  const isDark = variant === "dark";
  const isCompact = variant === "compact";
  const accentText = readableText(accentColor);

  // Empty state
  if (!githubUsername) {
    return (
      <CoreBlock
        blockId={block.id}
        blockType={block.type}
        isEditable={isEditable}
        onDelete={onDelete}
      >
        <div className="flex items-center justify-center h-full min-h-[80px] flex-col gap-2 text-center">
          <GithubLogo className="w-5 h-5 text-sys-label-tertiary" />
          <span className="text-sm text-sys-label-secondary">
            Edit this block to add your GitHub username.
          </span>
        </div>
      </CoreBlock>
    );
  }

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      onDelete={onDelete}
      className={cn(
        "relative",
        isDark && "!bg-slate-900 !border-slate-700"
      )}
    >
      <div className={cn("flex flex-col h-full", isDark && "text-white")}>
        {/* Top: label + GitHub link */}
        <div className="flex items-start justify-between mb-3">
          <span
            className={cn(
              "uppercase font-bold text-[10px] tracking-wider",
              isDark ? "text-slate-400" : "text-sys-label-secondary"
            )}
          >
            {METRIC_LABEL[metric]}
          </span>
          <Link
            href={`https://github.com/${githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={isEditable ? (e) => e.preventDefault() : undefined}
            aria-label={`@${githubUsername} on GitHub`}
            className={cn(
              "transition-colors",
              isDark
                ? "text-slate-500 hover:text-white"
                : "text-sys-label-tertiary hover:text-sys-label-primary"
            )}
          >
            <GithubLogo className="w-4 h-4" />
          </Link>
        </div>

        {/* Headline number */}
        <div className="flex-1 flex items-end gap-3">
          {loading ? (
            <div
              className={cn(
                "h-10 w-20 rounded animate-pulse",
                isDark ? "bg-slate-700" : "bg-sys-bg-secondary"
              )}
            />
          ) : error ? (
            <span
              className={cn(
                "text-sm",
                isDark ? "text-slate-400" : "text-sys-label-secondary"
              )}
            >
              Couldn't load stats.
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums leading-none",
                  isCompact && "text-3xl"
                )}
                style={isDark ? undefined : { color: accentColor }}
              >
                {data ? compact(data.value) : "—"}
              </span>
              {data?.delta !== null && data?.delta !== undefined && (
                <span
                  className={cn(
                    "text-sm font-semibold mb-1 px-1.5 py-0.5 rounded-md",
                    data.delta >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700",
                    isDark &&
                      (data.delta >= 0
                        ? "!bg-emerald-500/20 !text-emerald-400"
                        : "!bg-rose-500/20 !text-rose-400")
                  )}
                >
                  {data.delta > 0 ? "+" : ""}
                  {data.delta}%
                </span>
              )}
            </>
          )}
        </div>

        {/* Profile footer — hidden in compact variant to save space */}
        {!isCompact && data?.profile && (
          <div className="flex items-center gap-2 mt-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.profile.avatarUrl}
              alt={data.profile.handle}
              className="w-6 h-6 rounded-full shrink-0"
            />
            <span
              className={cn(
                "text-xs truncate",
                isDark ? "text-slate-300" : "text-sys-label-secondary"
              )}
            >
              @{data.profile.handle}
            </span>
          </div>
        )}

        {/* Tiny accent stripe at the bottom for visual punch */}
        {!isDark && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 opacity-80"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
        )}
      </div>
    </CoreBlock>
  );
}
