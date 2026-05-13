"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, Loader2, AlertTriangle, Trash2 } from "lucide-react";

// M5: Reserved slugs — must match the API list
const RESERVED_SLUGS = new Set([
  "admin", "api", "p", "dashboard", "login", "signup", "sign-in", "sign-up",
  "blog", "pricing", "about", "contact", "help", "support", "terms", "privacy",
  "404", "500", "me", "home", "www", "app",
]);

interface Domain {
  id: string;
  domain: string;
}

interface SettingsSectionProps {
  slug: string;
  currentGalleryId: string;
  galleryId: string;           // M1: needed for the delete endpoint
  seoTitle: string;
  seoDescription: string;
  customDomainId: string | null;
  showBranding: boolean;
  isPaidPlan: boolean;
  domains: Domain[];
  onUpdate: (patch: {
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
    customDomainId?: string | null;
    showBranding?: boolean;
  }) => void;
  onDelete: () => void;        // M1: called by GalleryBuilder to run DELETE + redirect
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function SettingsSection({
  slug,
  seoTitle,
  seoDescription,
  customDomainId,
  showBranding,
  isPaidPlan,
  domains,
  onUpdate,
  onDelete,
}: SettingsSectionProps) {
  const [slugInput, setSlugInput] = useState(slug);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugError, setSlugError] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSlugInput(slug);
  }, [slug]);

  function validateSlugClient(val: string): string | null {
    if (val.length < 3) return "Slug must be at least 3 characters";
    if (val.length > 30) return "Slug must be at most 30 characters";
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(val)) {
      return "Only lowercase letters, numbers, and hyphens allowed";
    }
    if (RESERVED_SLUGS.has(val)) return "This slug is reserved";
    return null;
  }

  function handleSlugChange(val: string) {
    // M5: Strip invalid chars server-side-style before even checking
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlugInput(clean);
    setSlugError("");

    if (clean === slug) {
      setSlugStatus("idle");
      return;
    }

    const clientError = validateSlugClient(clean);
    if (clientError) {
      setSlugStatus("invalid");
      setSlugError(clientError);
      return;
    }

    setSlugStatus("checking");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gallery/slug-check?slug=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.error) {
          setSlugStatus("invalid");
          setSlugError(data.error);
        } else {
          setSlugStatus(data.available ? "available" : "taken");
          if (data.available) onUpdate({ slug: clean });
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 600);
  }

  return (
    <div className="space-y-5">
      {/* Slug */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Page Slug
        </label>
        <div className="flex items-center rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 bg-background">
          <span className="px-3 py-2 text-xs text-muted-foreground bg-muted border-r border-border shrink-0 select-none">
            linkfor.ge/
          </span>
          <input
            type="text"
            value={slugInput}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="your-slug"
            maxLength={30}
            className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none font-mono"
          />
          <div className="px-2 shrink-0">
            {slugStatus === "checking" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            {slugStatus === "available" && <CheckCircle className="w-4 h-4 text-green-500" />}
            {slugStatus === "taken" && <XCircle className="w-4 h-4 text-destructive" />}
            {slugStatus === "invalid" && <XCircle className="w-4 h-4 text-muted-foreground/40" />}
          </div>
        </div>
        {/* M5: Show specific validation error */}
        {slugStatus === "invalid" && slugError && (
          <p className="text-xs text-destructive mt-1">{slugError}</p>
        )}
        {slugStatus === "taken" && (
          <p className="text-xs text-destructive mt-1">This slug is already taken.</p>
        )}
        {slugStatus === "available" && (
          <p className="text-xs text-green-600 mt-1">✓ This slug is available!</p>
        )}
        <p className="text-xs text-muted-foreground/50 mt-1">
          3–30 characters, lowercase letters, numbers, and hyphens only
        </p>
      </div>

      {/* Custom domain */}
      {domains.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Custom Domain
          </label>
          <select
            value={customDomainId ?? ""}
            onChange={(e) => onUpdate({ customDomainId: e.target.value || null })}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Use default (linkfor.ge)</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.domain}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* SEO */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          SEO Title
        </label>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => onUpdate({ seoTitle: e.target.value })}
          placeholder="My LinkForge Page"
          maxLength={200}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          SEO Description
        </label>
        <textarea
          value={seoDescription}
          onChange={(e) => onUpdate({ seoDescription: e.target.value })}
          placeholder="A short description for search engines and social sharing..."
          rows={3}
          maxLength={500}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50 resize-none"
        />
      </div>

      {/* Branding toggle */}
      <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-xl border border-border">
        <div>
          <p className="text-sm font-medium">Powered by LinkForge</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPaidPlan ? "Show or hide the branding footer" : "Required on free plan"}
          </p>
        </div>
        <button
          disabled={!isPaidPlan}
          onClick={() => onUpdate({ showBranding: !showBranding })}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            showBranding ? "bg-primary" : "bg-muted-foreground/30"
          } ${!isPaidPlan ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              showBranding ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* M1: Danger zone — delete bio page */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Danger Zone
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete bio page
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                This will permanently delete your bio page and all its click history. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-1.5 text-xs font-semibold bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Yes, delete permanently
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
