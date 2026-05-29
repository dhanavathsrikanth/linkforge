"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AtSign,
  ExternalLink,
} from "lucide-react";
import { Field, TextInput, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";
import { cn } from "@/lib/utils";

// ─── GitHub mark — lucide-react v1 doesn't ship a Github icon ────────────────

function GithubMark({ className }: { className?: string }) {
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

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Public schema for the GitHub commits block. Kept in sync with the
 * config consumed by `GitHubCommitsBlock`.
 */
export interface GitHubConfig {
  githubUsername?: string;
  /** What stat headline to show on the public page */
  metric?: "commits-month" | "commits-year" | "public-repos" | "followers";
  /** Show the % delta vs the previous period (only for monthly commits) */
  showDelta?: boolean;
  /** Display style on the canvas / public page */
  variant?: "default" | "compact" | "dark";
  /** Accent applied to the headline number + GitHub logo */
  accentColor?: string;
}

interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
}

const DEFAULT_ACCENT = "#0F172A";

// Username constraints from GitHub: 1–39 chars, alphanumeric + single
// hyphens, can't start/end with hyphen.
const USERNAME_RE = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;

// ─── Live username verification ───────────────────────────────────────────────

type VerifyState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; profile: GitHubProfile }
  | { status: "not_found" }
  | { status: "rate_limited" }
  | { status: "error"; message: string }
  | { status: "invalid" };

function useGithubProfile(username: string): VerifyState {
  const [state, setState] = useState<VerifyState>({ status: "idle" });
  const cacheRef = useRef<Map<string, GitHubProfile>>(new Map());

  useEffect(() => {
    const trimmed = username.replace(/^@/, "").trim();
    if (!trimmed) {
      setState({ status: "idle" });
      return;
    }
    if (!USERNAME_RE.test(trimmed)) {
      setState({ status: "invalid" });
      return;
    }

    const cached = cacheRef.current.get(trimmed.toLowerCase());
    if (cached) {
      setState({ status: "ok", profile: cached });
      return;
    }

    let cancelled = false;
    setState({ status: "checking" });

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}`, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (cancelled) return;
        if (res.status === 404) return setState({ status: "not_found" });
        if (res.status === 403) return setState({ status: "rate_limited" });
        if (!res.ok) return setState({ status: "error", message: `HTTP ${res.status}` });
        const profile: GitHubProfile = await res.json();
        cacheRef.current.set(trimmed.toLowerCase(), profile);
        setState({ status: "ok", profile });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "network error",
          });
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username]);

  return state;
}

// ─── Metric picker ────────────────────────────────────────────────────────────

const METRICS: {
  id: NonNullable<GitHubConfig["metric"]>;
  label: string;
  description: string;
}[] = [
  { id: "commits-month", label: "Commits this month", description: "Live count from GitHub Search" },
  { id: "commits-year", label: "Commits this year", description: "Year-to-date contribution count" },
  { id: "public-repos", label: "Public repos", description: "Total repositories owned" },
  { id: "followers", label: "Followers", description: "Total followers on GitHub" },
];

// ─── Variant picker ───────────────────────────────────────────────────────────

const VARIANTS: { id: NonNullable<GitHubConfig["variant"]>; label: string; preview: string }[] = [
  { id: "default", label: "Default", preview: "bg-white border border-stone-200" },
  { id: "compact", label: "Compact", preview: "bg-stone-50 border border-stone-100" },
  { id: "dark", label: "Dark", preview: "bg-slate-900 border border-slate-700" },
];

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ verify }: { verify: VerifyState }) {
  if (verify.status === "idle") return null;
  if (verify.status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking…
      </span>
    );
  }
  if (verify.status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
        <CheckCircle2 className="w-3 h-3" />
        Verified
      </span>
    );
  }
  if (verify.status === "not_found") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
        <XCircle className="w-3 h-3" />
        Username not found
      </span>
    );
  }
  if (verify.status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
        <XCircle className="w-3 h-3" />
        Invalid format
      </span>
    );
  }
  if (verify.status === "rate_limited") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
        <XCircle className="w-3 h-3" />
        GitHub rate limited — try again in a minute
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
      <XCircle className="w-3 h-3" />
      {verify.message}
    </span>
  );
}

// ─── Profile preview ──────────────────────────────────────────────────────────

function ProfilePreview({ profile }: { profile: GitHubProfile }) {
  return (
    <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url}
          alt={profile.login}
          className="w-12 h-12 rounded-full shrink-0 ring-2 ring-white"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-stone-900 truncate">
              {profile.name ?? profile.login}
            </span>
            <a
              href={profile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-600 transition-colors shrink-0"
              title="View on GitHub"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-stone-500 truncate">@{profile.login}</p>
          {profile.bio && (
            <p className="text-[11px] text-stone-600 mt-1 line-clamp-2">{profile.bio}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-500">
            <span>
              <span className="font-semibold text-stone-700">{profile.public_repos.toLocaleString()}</span>{" "}
              repos
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold text-stone-700">{profile.followers.toLocaleString()}</span>{" "}
              followers
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GitHubForm ───────────────────────────────────────────────────────────────

export function GitHubForm({ config: raw, onSave, onCancel }: BlockFormProps) {
  const init = raw as GitHubConfig;
  const [githubUsername, setGithubUsername] = useState(init.githubUsername ?? "");
  const [metric, setMetric] = useState<NonNullable<GitHubConfig["metric"]>>(
    init.metric ?? "commits-month"
  );
  const [showDelta, setShowDelta] = useState(init.showDelta !== false);
  const [variant, setVariant] = useState<NonNullable<GitHubConfig["variant"]>>(
    init.variant ?? "default"
  );
  const [accentColor, setAccentColor] = useState(init.accentColor ?? DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);

  const verify = useGithubProfile(githubUsername);

  // Strip @ and whitespace before saving so the public block always works
  // regardless of how the user typed it (e.g. "@torvalds" or "torvalds ").
  const canonical = githubUsername.replace(/^@/, "").trim();
  const canSave =
    verify.status === "ok" || verify.status === "rate_limited" || verify.status === "error";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canonical) return;
    setSaving(true);
    onSave({
      githubUsername: canonical,
      metric,
      showDelta: metric === "commits-month" ? showDelta : false,
      variant,
      accentColor,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Username ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          GitHub account
        </div>

        <Field
          label="Username"
          htmlFor="gh-username"
          hint="We'll fetch live stats from your public GitHub profile."
        >
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            <TextInput
              id="gh-username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="torvalds"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              className="!pl-8"
            />
            {verify.status === "checking" && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 animate-spin" />
            )}
          </div>
        </Field>

        <div className="flex items-center justify-between min-h-[16px]">
          <StatusPill verify={verify} />
          {canonical && (
            <a
              href={`https://github.com/${canonical}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-stone-500 hover:text-stone-800 inline-flex items-center gap-1"
            >
              <GithubMark className="w-3 h-3" />
              Open profile
            </a>
          )}
        </div>

        {verify.status === "ok" && <ProfilePreview profile={verify.profile} />}
      </div>

      {/* ── Metric ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Headline metric
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={cn(
                "flex items-start justify-between gap-2 px-3 py-2 rounded-xl border-2 transition-all cursor-pointer text-left",
                metric === m.id
                  ? "border-primary bg-primary/5"
                  : "border-stone-200 bg-white hover:border-stone-300"
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-stone-900">{m.label}</span>
                <span className="text-[11px] text-stone-500">{m.description}</span>
              </div>
              {metric === m.id && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>

        {/* Show-delta toggle is only meaningful for monthly commits */}
        {metric === "commits-month" && (
          <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
            <input
              type="checkbox"
              checked={showDelta}
              onChange={(e) => setShowDelta(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <span className="text-xs text-stone-700">
              Show % change vs last month
            </span>
          </label>
        )}
      </div>

      {/* ── Style ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Style
        </div>

        <Field label="Variant">
          <div className="grid grid-cols-3 gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all cursor-pointer",
                  variant === v.id ? "border-primary bg-primary/5" : "border-stone-200 hover:border-stone-300"
                )}
              >
                <div className={cn("w-full h-10 rounded-lg", v.preview)} />
                <span className="text-[11px] font-medium text-stone-700">{v.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Accent color" htmlFor="gh-accent">
          <div className="flex items-center gap-2">
            <input
              id="gh-accent"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer bg-white"
              aria-label="Accent color"
            />
            <TextInput
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#0F172A"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
            <button
              type="button"
              onClick={() => setAccentColor(DEFAULT_ACCENT)}
              className="text-[11px] text-stone-500 hover:text-stone-800 px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </Field>
      </div>

      {/* Footer — disable save when verification clearly says the user
          doesn't exist or the format is invalid. We allow saving when
          GitHub rate-limits us (the public page will fetch later) or
          when there's a transient error. */}
      <FormFooter
        onCancel={onCancel}
        saving={saving}
        canSave={canonical.length > 0 && canSave}
      />
    </form>
  );
}
