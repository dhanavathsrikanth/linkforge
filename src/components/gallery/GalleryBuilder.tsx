"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe,
  Link2,
  Palette,
  Settings2,
  ChevronDown,
  ExternalLink,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";
import { ProfileSection } from "./editor/ProfileSection";
import { LinksSection } from "./editor/LinksSection";
import { AppearanceSection } from "./editor/AppearanceSection";
import { SettingsSection } from "./editor/SettingsSection";
import { PhonePreview } from "./preview/PhonePreview";
import type { GalleryPage, GalleryAppearance, GalleryLink } from "@/types/gallery";
import { DEFAULT_APPEARANCE } from "@/types/gallery";

// ─── Collapsible section ──────────────────────────────────────────────────────

function EditorSection({
  id,
  icon: Icon,
  title,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  badge?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {badge !== undefined && (
          <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full tabular-nums">
            {badge}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-border bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Save status indicator ─────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
        status === "saving"
          ? "text-muted-foreground"
          : status === "saved"
          ? "text-green-600"
          : "text-destructive"
      }`}
    >
      {status === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "saved" && <CheckCircle2 className="w-3 h-3" />}
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save failed"}
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

interface Domain {
  id: string;
  domain: string;
}

interface GalleryBuilderProps {
  initialGallery: GalleryPage;
  domains: Domain[];
  isPaidPlan: boolean;
}

export function GalleryBuilder({ initialGallery, domains, isPaidPlan }: GalleryBuilderProps) {
  const [gallery, setGallery] = useState<GalleryPage>(initialGallery);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openSection, setOpenSection] = useState<string>("profile");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auto-save (debounced 1.5s) ───────────────────────────────────────────
  const triggerSave = useCallback((updatedGallery: GalleryPage) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");

    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: updatedGallery.displayName,
            bio: updatedGallery.bio,
            avatarInitials: updatedGallery.avatarInitials,
            avatarBgColor: updatedGallery.avatarBgColor,
            links: updatedGallery.links,
            appearance: updatedGallery.appearance,
            seoTitle: updatedGallery.seoTitle,
            seoDescription: updatedGallery.seoDescription,
            showBranding: updatedGallery.showBranding,
            slug: updatedGallery.slug,
            customDomainId: updatedGallery.customDomainId,
            // P6: Send local timestamp so server can detect concurrent edits
            updatedAt: updatedGallery.updatedAt,
          }),
        });

        // P6: Handle conflict — another tab/device saved more recently
        if (res.status === 409) {
          const data = await res.json();
          if (data.error === "conflict") {
            setSaveStatus("error");
            window.alert(
              "⚠️ This page was updated elsewhere. Refresh to see the latest version, or keep editing to overwrite."
            );
            return;
          }
        }

        if (!res.ok) throw new Error("save failed");
        const data = await res.json();
        // Keep local updatedAt in sync so subsequent saves have the correct timestamp
        setGallery((g) => ({ ...g, updatedAt: data.gallery.updatedAt }));
        setSaveStatus("saved");

        if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
        savedIndicatorTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    };
  }, []);

  // ─── Update helpers ───────────────────────────────────────────────────────
  function update(patch: Partial<GalleryPage>) {
    const next = { ...gallery, ...patch };
    setGallery(next);
    triggerSave(next);
  }

  function updateAppearance(patch: Partial<GalleryAppearance>) {
    const next = {
      ...gallery,
      appearance: { ...(gallery.appearance ?? DEFAULT_APPEARANCE), ...patch },
    };
    setGallery(next);
    triggerSave(next);
  }

  function updateLinks(links: GalleryLink[]) {
    update({ links });
  }

  // ─── Publish toggle ───────────────────────────────────────────────────────
  async function handlePublish() {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/gallery/${gallery.id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGallery((g) => ({ ...g, isPublished: data.gallery.isPublished }));
    } catch {
      alert("Failed to update publish state. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  }

  // ─── Delete (M1) ──────────────────────────────────────────────────────────
  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/gallery/${gallery.id}/publish`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      // Redirect to dashboard after deletion
      window.location.href = "/dashboard";
    } catch {
      alert("Failed to delete bio page. Please try again.");
      setIsDeleting(false);
    }
  }

  const a = gallery.appearance ?? DEFAULT_APPEARANCE;

  const sections = [
    {
      id: "profile",
      icon: User,
      title: "Profile",
      content: (
        <ProfileSection
          displayName={gallery.displayName ?? ""}
          bio={gallery.bio ?? ""}
          avatarInitials={gallery.avatarInitials ?? ""}
          avatarBgColor={gallery.avatarBgColor}
          onUpdate={(patch) => update(patch)}
        />
      ),
    },
    {
      id: "links",
      icon: Link2,
      title: "Links",
      badge: gallery.links.filter((l) => l.visible).length,
      content: (
        <LinksSection links={gallery.links} onUpdate={updateLinks} />
      ),
    },
    {
      id: "appearance",
      icon: Palette,
      title: "Appearance",
      content: (
        <AppearanceSection appearance={a} onUpdate={updateAppearance} />
      ),
    },
    {
      id: "settings",
      icon: Settings2,
      title: "Settings",
      content: (
        <SettingsSection
          slug={gallery.slug}
          currentGalleryId={gallery.id}
          galleryId={gallery.id}
          seoTitle={gallery.seoTitle ?? ""}
          seoDescription={gallery.seoDescription ?? ""}
          customDomainId={gallery.customDomainId}
          showBranding={gallery.showBranding}
          isPaidPlan={isPaidPlan}
          domains={domains}
          onUpdate={(patch) => update(patch)}
          onDelete={handleDelete}
        />
      ),
    },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── LEFT: Editor panel ────────────────────────────────────── */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-border bg-background overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
          <div>
            <h1 className="text-base font-bold tracking-tight">Link in Bio</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  gallery.isPublished ? "bg-green-500" : "bg-muted-foreground/40"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {gallery.isPublished ? "Published" : "Draft"}
              </span>
              <SaveIndicator status={saveStatus} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview link */}
            {gallery.isPublished && (
              <a
                href={`/p/${gallery.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Open published page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                gallery.isPublished
                  ? "bg-muted text-foreground hover:bg-muted/80 border border-border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
              }`}
            >
              {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Globe className="w-3.5 h-3.5" />
              {gallery.isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>

        {/* Scrollable editor */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {sections.map((s) => (
            <EditorSection
              key={s.id}
              id={s.id}
              icon={s.icon}
              title={s.title}
              badge={s.badge}
              isOpen={openSection === s.id}
              onToggle={() => setOpenSection(openSection === s.id ? "" : s.id)}
            >
              {s.content}
            </EditorSection>
          ))}
        </div>
      </div>

      {/* ─── RIGHT: Live preview ───────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-8 overflow-auto"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(99,102,241,0.07) 0%, transparent 60%), " +
            "linear-gradient(135deg, #0d0d1a 0%, #0f0f1a 100%)",
        }}
      >
        <PhonePreview gallery={gallery} />
      </div>
    </div>
  );
}
