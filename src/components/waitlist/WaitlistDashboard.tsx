"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Loader2,
  Check,
  Copy,
  Share2,
  Trophy,
  Zap,
  Users,
  ArrowUp,
  Gift,
  ExternalLink,
} from "lucide-react";

type Feature = "link-in-bio" | "custom-domains";

interface WaitlistEntry {
  id: string;
  email: string;
  feature: string;
  points: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
}

interface WaitlistDashboardProps {
  feature: Feature;
  badge: {
    label: string;
    className: string;
  };
  headline: string;
  subtext: string;
  bullets: string[];
  buttonLabel: string;
  timelineLabel: string;
}

const MILESTONES = [
  { points: 100, label: "Early Adopter" },
  { points: 250, label: "Beta Tester" },
  { points: 500, label: "VIP" },
  { points: 1000, label: "Power User" },
];

export function WaitlistDashboard({
  feature,
  badge,
  headline,
  subtext,
  bullets,
  buttonLabel,
  timelineLabel,
}: WaitlistDashboardProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const savedEmail =
    typeof window !== "undefined"
      ? localStorage.getItem(`waitlist_email_${feature}`)
      : null;

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
      lookupEntry(savedEmail);
    } else {
      setLoading(false);
    }
  }, [savedEmail]);

  async function lookupEntry(emailToLookup: string) {
    try {
      const res = await fetch(
        `/api/waitlist?email=${encodeURIComponent(emailToLookup)}&feature=${feature}`
      );
      const data = await res.json();
      if (data.exists && data.entry) {
        setEntry(data.entry);
        setPosition(data.position);
        setTotal(data.total);
        localStorage.setItem(`waitlist_email_${feature}`, data.entry.email);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, feature }),
      });

      const data = await res.json();

      if (res.ok || res.status === 409 || data.exists) {
        setEntry(data.entry ?? data.exists);
        setPosition(data.position);
        setTotal(data.total);
        localStorage.setItem(`waitlist_email_${feature}`, email);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function calculateProgress(points: number): number {
    for (const m of MILESTONES) {
      if (points < m.points) {
        const prev = MILESTONES[MILESTONES.indexOf(m) - 1]?.points ?? 0;
        return ((points - prev) / (m.points - prev)) * 100;
      }
    }
    return 100;
  }

  function getNextMilestone(points: number) {
    for (const m of MILESTONES) {
      if (points < m.points) return m;
    }
    return null;
  }

  function getCurrentMilestone(points: number) {
    let current: (typeof MILESTONES)[number] | null = null;
    for (const m of MILESTONES) {
      if (points >= m.points) current = m;
    }
    return current;
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/waitlist/join?ref=${entry?.referralCode}&feature=${feature}`
      : "";

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const nextMilestone = entry ? getNextMilestone(entry.points) : null;
  const currentMilestone = entry ? getCurrentMilestone(entry.points) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entry && position !== null && total !== null) {
    const progress = calculateProgress(entry.points);

    return (
      <div className="flex items-center justify-center min-h-full py-8">
        <div className="max-w-[560px] w-full px-6 space-y-6">
          <div className="text-center space-y-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <p className="text-3xl font-bold tracking-tight">
              You&apos;re on the list
            </p>
            <p className="text-muted-foreground text-sm">
              Here&apos;s your waitlist dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-amber-400" />
              <p className="text-2xl font-bold">#{position}</p>
              <p className="text-xs text-muted-foreground">of {total}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-1 text-purple-400" />
              <p className="text-2xl font-bold">{entry.points}</p>
              <p className="text-xs text-muted-foreground">
                points{currentMilestone ? ` \u2022 ${currentMilestone.label}` : ""}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              {nextMilestone && (
                <span className="text-xs text-muted-foreground">
                  {entry.points} / {nextMilestone.points} &rarr;{" "}
                  {nextMilestone.label}
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            {!nextMilestone && (
              <p className="text-xs text-muted-foreground mt-2">
                Max level reached!
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">
                Share your referral link
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Earn <strong>20 points</strong> for every person who joins using
              your link.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground truncate"
              />
              <button
                onClick={copyReferralLink}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 text-left">
            <p className="text-sm font-medium mb-1">Timeline</p>
            <p className="text-xs text-muted-foreground">{timelineLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="max-w-[560px] w-full px-6 py-12 text-center">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${badge.className} mb-6`}
        >
          {badge.label}
        </span>

        <h1 className="text-3xl font-bold tracking-tight mb-4">{headline}</h1>

        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          {subtext}
        </p>

        <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
          {bullets.map((text) => (
            <div key={text} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {buttonLabel}
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}

        <div className="mt-8 rounded-xl border border-border p-4 text-left">
          <p className="text-sm font-medium mb-1">Timeline</p>
          <p className="text-xs text-muted-foreground">{timelineLabel}</p>
        </div>
      </div>
    </div>
  );
}
