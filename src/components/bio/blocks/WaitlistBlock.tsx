"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, Mail, Users } from "lucide-react";
import { CoreBlock } from "@/components/bio/CoreBlock";
import { useBlockSubmission } from "./useBlockClick";
import { cn } from "@/lib/utils";
import type { BioBlock } from "@/components/bio/BioCanvas";
import type { WaitlistConfig } from "@/components/bio/forms/WaitlistForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a hex colour to an `rgb()` string for compositing inside
 * inline styles where alpha needs to be a separate value.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Pick black or white text colour to ensure WCAG-acceptable contrast on `bg`. */
function readableText(bg: string): string {
  const rgb = hexToRgb(bg);
  if (!rgb) return "#ffffff";
  // Relative luminance per WCAG
  const linear = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const c = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  return linear(rgb) > 0.5 ? "#0F172A" : "#FFFFFF";
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

/**
 * Lightweight, dependency-free confetti burst rendered into a canvas
 * scoped to the block. Plays once per submission. Skipped when the user
 * has `prefers-reduced-motion` set so we respect accessibility prefs.
 */
function Confetti({ play, accent }: { play: boolean; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!play) return;
    if (typeof window === "undefined") return;

    // Honour reduced-motion preference
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const rect = parent?.getBoundingClientRect();
    const W = (rect?.width ?? 320);
    const H = (rect?.height ?? 200);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Palette mixes the user's accent with festive defaults so single-hue
    // accents still produce a colourful blast.
    const palette = [
      accent,
      "#F472B6", // pink-400
      "#FBBF24", // amber-400
      "#34D399", // emerald-400
      "#60A5FA", // blue-400
      "#A78BFA", // violet-400
    ];

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      g: number;       // gravity
      rot: number;
      vrot: number;
      size: number;
      color: string;
      shape: "rect" | "circle";
      life: number;
      maxLife: number;
    };

    const particles: Particle[] = [];
    const COUNT = 90;
    const originX = W / 2;
    const originY = H * 0.6;

    for (let i = 0; i < COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 6 + Math.random() * 7;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        g: 0.18 + Math.random() * 0.07,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.4,
        size: 4 + Math.random() * 6,
        color: palette[Math.floor(Math.random() * palette.length)],
        shape: Math.random() > 0.4 ? "rect" : "circle",
        life: 0,
        maxLife: 70 + Math.random() * 40,
      });
    }

    let raf = 0;
    let cancelled = false;
    const start = performance.now();

    function step() {
      if (cancelled || !ctx) return;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;

      for (const p of particles) {
        if (p.life >= p.maxLife) continue;
        alive++;
        p.life += 1;
        p.vy += p.g;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;

        const fade = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Stop after all particles fade or 4s safety cap
      if (alive > 0 && performance.now() - start < 4000) {
        raf = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }
    raf = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
    };
  }, [play, accent]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none z-30"
    />
  );
}

// ─── WaitlistBlock ────────────────────────────────────────────────────────────

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function WaitlistBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as WaitlistConfig;
  const {
    title = "Join the waitlist",
    label = "Be the first to hear when we launch — no spam, ever.",
    buttonLabel = "Notify me",
    successTitle = "You're on the list! 🎉",
    successLabel = "We'll be in touch soon.",
    placeholder = "you@example.com",
    mode = "internal",
    waitlistId,
    variant = "card",
    accentColor = "#6366F1",
    confetti = true,
  } = config;

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [playConfetti, setPlayConfetti] = useState(false);
  const [touched, setTouched] = useState(false);

  const trackSubmission = useBlockSubmission(block.id, isEditable);

  // In editor mode, show a live signup count badge so the owner can see
  // at a glance how many people have joined — without opening the form editor.
  const [signupCount, setSignupCount] = useState<number | null>(null);
  useEffect(() => {
    if (!isEditable || !block.id) return;
    fetch(`/api/bio/blocks/${block.id}/submissions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.submissions) setSignupCount(body.submissions.length);
      })
      .catch(() => {});
  }, [block.id, isEditable]);

  // Light client-side email check that mirrors common server validators.
  // Doesn't replace server validation — just surfaces obvious mistakes
  // before the user clicks submit.
  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
  const trimmed = email.trim();
  const showInlineError = touched && trimmed.length > 0 && !isValidEmail(trimmed);
  const canSubmit = !submitting && !isEditable && isValidEmail(trimmed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isEditable) return;
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (mode === "getwaitlist") {
        if (!waitlistId) {
          throw new Error("Waitlist isn't configured yet.");
        }
        const res = await fetch("https://api.getwaitlist.com/api/v1/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed, waitlist_id: waitlistId }),
        });
        if (!res.ok) throw new Error("Sign up failed.");
      }
      // For both modes we record an internal submission event so the
      // owner can see signups in their analytics panel — even getwaitlist
      // users benefit from the local copy.
      trackSubmission({
        email: trimmed,
        emailDomain: trimmed.split("@")[1] ?? "",
        mode,
        ...(waitlistId ? { waitlistId } : {}),
      });

      setSubmitted(true);
      if (confetti) setPlayConfetti(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Variant styling ─────────────────────────────────────────────────────
  const isGradient = variant === "gradient";
  const buttonTextColor = readableText(accentColor);

  // For the gradient variant, use the accent as the dominant gradient
  // colour. Falls back to a default purple/pink if hex is malformed.
  const gradientStyle: React.CSSProperties = isGradient
    ? {
        backgroundImage: `linear-gradient(135deg, ${accentColor} 0%, #EC4899 60%, #F59E0B 100%)`,
      }
    : {};

  // Editor mode shows a small "demo" badge so users understand why
  // submissions in the editor are inert.
  const isDemo = isEditable;

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      onDelete={onDelete}
      className={cn(
        "relative overflow-hidden flex flex-col",
        variant === "minimal" && "!shadow-none !bg-sys-bg-secondary",
        isGradient && "!border-0"
      )}
    >
      {/* Gradient backdrop layer, behind content */}
      {isGradient && (
        <div className="absolute inset-0 -z-0" style={gradientStyle} aria-hidden />
      )}

      <div className={cn("relative z-10 flex flex-col h-full", isGradient && "text-white")}>
        {/* Demo badge + signup count in editor */}
        {isDemo && (
          <div className="absolute top-0 right-0 flex items-center gap-1.5">
            {signupCount !== null && signupCount > 0 && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  isGradient
                    ? "bg-white/25 text-white"
                    : "bg-primary/10 text-primary"
                )}
                title="Open block settings → Submissions tab to see all emails"
              >
                <Users className="w-2.5 h-2.5" />
                {signupCount} signup{signupCount === 1 ? "" : "s"}
              </span>
            )}
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                isGradient
                  ? "bg-white/20 text-white"
                  : "bg-stone-100 text-stone-500"
              )}
            >
              Preview
            </span>
          </div>
        )}

        {!submitted ? (
          <>
            <h2
              className={cn(
                "text-xl font-semibold mb-1",
                !isGradient && "text-sys-title-primary"
              )}
            >
              {title}
            </h2>
            {label && (
              <p
                className={cn(
                  "text-sm mb-4",
                  isGradient ? "text-white/90" : "text-sys-label-secondary"
                )}
              >
                {label}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-2">
              <div className={cn(
                "flex flex-col sm:flex-row gap-2 w-full",
              )}>
                {/* Input with mail icon */}
                <div className="relative flex-1 min-w-0">
                  <Mail
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none",
                      isGradient ? "text-white/70" : "text-stone-400"
                    )}
                  />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder={placeholder}
                    required
                    disabled={isEditable}
                    aria-invalid={showInlineError || undefined}
                    aria-describedby={showInlineError ? `${block.id}-err` : undefined}
                    className={cn(
                      "w-full rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none transition",
                      isGradient
                        ? "bg-white/15 backdrop-blur-sm text-white placeholder:text-white/60 ring-1 ring-inset ring-white/30 focus:ring-2 focus:ring-white/70"
                        : "bg-sys-bg-secondary text-sys-label-primary placeholder:text-sys-label-secondary ring-1 ring-inset ring-sys-bg-border focus:ring-2",
                      showInlineError && (isGradient
                        ? "ring-rose-200 focus:ring-rose-100"
                        : "ring-rose-400 focus:ring-rose-300"),
                      isEditable && "cursor-not-allowed opacity-70"
                    )}
                    style={
                      !isGradient && !showInlineError
                        ? { boxShadow: undefined } as React.CSSProperties
                        : undefined
                    }
                    aria-label="Email address"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    backgroundColor: accentColor,
                    color: buttonTextColor,
                  }}
                  className={cn(
                    "shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    !canSubmit && "opacity-50 cursor-not-allowed",
                    isGradient && "shadow-md"
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    buttonLabel
                  )}
                </button>
              </div>

              {/* Inline validation hint */}
              {showInlineError && (
                <p
                  id={`${block.id}-err`}
                  className={cn(
                    "text-xs px-1",
                    isGradient ? "text-white/90" : "text-rose-500"
                  )}
                >
                  Hmm, that doesn't look like a valid email.
                </p>
              )}

              {/* Server / network error (e.g. getwaitlist API down) */}
              {error && !showInlineError && (
                <p
                  className={cn(
                    "text-xs px-1",
                    isGradient ? "text-white/90" : "text-rose-500"
                  )}
                >
                  {error}
                </p>
              )}

              {/* Microcopy: privacy reassurance only when no errors */}
              {!showInlineError && !error && (
                <p
                  className={cn(
                    "text-[11px] px-1",
                    isGradient ? "text-white/70" : "text-sys-label-tertiary"
                  )}
                >
                  We'll only use your email for waitlist updates.
                </p>
              )}
            </form>
          </>
        ) : (
          /* ── Success state ──────────────────────────────────── */
          <div
            className={cn(
              "flex flex-col items-center text-center justify-center flex-1 gap-2 py-3 animate-in fade-in zoom-in-95 duration-300",
              isGradient && "text-white"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-1",
                isGradient ? "bg-white/20" : "bg-green-100"
              )}
            >
              <CheckCircle2
                className={cn("w-6 h-6", isGradient ? "text-white" : "text-green-600")}
              />
            </div>
            <h3
              className={cn(
                "text-base font-semibold",
                !isGradient && "text-sys-title-primary"
              )}
            >
              {successTitle}
            </h3>
            <p
              className={cn(
                "text-xs",
                isGradient ? "text-white/90" : "text-sys-label-secondary"
              )}
            >
              {successLabel}
            </p>
          </div>
        )}
      </div>

      {/* Confetti — sits on top of everything but ignores pointer events */}
      <Confetti play={playConfetti} accent={accentColor} />
    </CoreBlock>
  );
}
