"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BioPageData, BioDomain } from "@/components/bio/BioEditor";
import { SidebarSettings } from "@/components/bio/sidebar/SidebarSettings";
import { ConfirmDialog } from "@/components/bio/ConfirmDialog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BioSettingsPageProps {
  initialData: BioPageData;
  domains: BioDomain[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Save indicator ───────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md",
        status === "saving" && "text-muted-foreground bg-muted",
        status === "saved" && "text-green-700 bg-green-50",
        status === "error" && "text-red-600 bg-red-50"
      )}
    >
      {status === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "saved" && <CheckCircle2 className="w-3 h-3" />}
      {status === "error" && <AlertTriangle className="w-3 h-3" />}
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save failed"}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Standalone settings page for a single bio.
 *
 * Reuses the existing `SidebarSettings` form so we have one source of
 * truth for the field UX. Adds:
 *   - A header with the bio name + save indicator.
 *   - A "Danger zone" card at the bottom for deleting the bio.
 *
 * The save logic mirrors `BioEditor.triggerSave`: debounced PATCH to
 * `/api/gallery` with conflict-detection-via-updatedAt.
 */
export function BioSettingsPage({ initialData, domains }: BioSettingsPageProps) {
  const router = useRouter();
  const [page, setPage] = useState<BioPageData>(initialData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isPublishing, setIsPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initialSlugRef = useRef(initialData.slug);
  const lastServerUpdatedAtRef = useRef<Date | string | null>(initialData.updatedAt);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auto-save (debounced 1s) ────────────────────────────────────────────
  const triggerSave = useCallback((updated: BioPageData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/gallery", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: updated.displayName,
            bio: updated.bio,
            avatarInitials: updated.avatarInitials,
            avatarBgColor: updated.avatarBgColor,
            seoTitle: updated.seoTitle,
            seoDescription: updated.seoDescription,
            showBranding: updated.showBranding,
            ...(updated.slug !== initialSlugRef.current ? { slug: updated.slug } : {}),
            themeId: updated.themeId,
            customDomainId: updated.customDomainId,
            id: updated.id,
            updatedAt: lastServerUpdatedAtRef.current ?? updated.updatedAt,
          }),
        });
        if (res.status === 409) {
          setSaveStatus("error");
          return;
        }
        if (!res.ok) {
          setSaveStatus("error");
          return;
        }
        const body = await res.json();
        if (body.gallery?.updatedAt) {
          lastServerUpdatedAtRef.current = body.gallery.updatedAt;
        }
        if (body.gallery?.slug) initialSlugRef.current = body.gallery.slug;
        setPage((p) => ({
          ...p,
          updatedAt: body.gallery?.updatedAt ?? p.updatedAt,
          slug: body.gallery?.slug ?? p.slug,
        }));
        setSaveStatus("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1000);
  }, []);

  function update(patch: Partial<BioPageData>) {
    const next = { ...page, ...patch };
    setPage(next);
    triggerSave(next);
  }

  // ─── Publish toggle ──────────────────────────────────────────────────────
  async function handlePublishToggle() {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/gallery/${page.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Forward themeId so built-in theme IDs survive in the snapshot.
        body: JSON.stringify({ themeId: page.themeId }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setPage((p) => ({
        ...p,
        isPublished: body.gallery.isPublished,
        publishedAt: body.gallery.publishedAt
          ? new Date(body.gallery.publishedAt)
          : p.publishedAt,
      }));
    } catch {
      // Soft-fail — the save indicator pattern will surface it on the next change.
    } finally {
      setIsPublishing(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/gallery/${page.id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleting(false);
        // Surface a brief failure state inline rather than redirecting.
        return;
      }
      router.push("/dashboard/bio");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {page.displayName || "Untitled page"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage URL, SEO, branding, and custom domain.
          </p>
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Reuse the existing settings panel — wrapped in a card so it
          looks at home in a full-page layout instead of a 280px rail. */}
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <SidebarSettings
          slug={page.slug}
          isPublished={page.isPublished}
          seoTitle={page.seoTitle ?? ""}
          seoDescription={page.seoDescription ?? ""}
          showBranding={page.showBranding}
          domains={domains}
          customDomainId={page.customDomainId}
          onUpdate={(patch) => update(patch)}
          onPublishToggle={handlePublishToggle}
          isPublishing={isPublishing}
        />
      </div>

      {/* Danger zone */}
      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-red-100 bg-red-50/50">
          <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
        </div>
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-900">Delete this bio page</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Permanently removes the page, all its blocks, and analytics history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete page
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this bio page?"
        description={`The page "${page.displayName || page.slug}" and all its content will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={() => {
          setConfirmDelete(false);
          void handleDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
        loading={deleting}
      />
    </div>
  );
}
