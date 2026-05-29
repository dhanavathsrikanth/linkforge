"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
  /** Whether the dialog is shown */
  open: boolean;
  /** Title at the top of the dialog */
  title: string;
  /** Body text — short prose describing what will happen */
  description?: string;
  /** Label for the confirm button (default "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default "Cancel") */
  cancelLabel?: string;
  /** Visual treatment — `danger` makes the confirm button red */
  variant?: "default" | "danger";
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user dismisses (X / cancel / Escape / overlay click) */
  onCancel: () => void;
  /** When true, the confirm button shows a loading spinner and is disabled */
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * In-app replacement for `window.confirm()`. Renders into a portal so
 * it sits above the bio editor's grid, traps focus, and supports
 * keyboard dismiss (Escape) and confirm (Enter).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelRef.current();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onConfirmRef.current();
    }
  }, []);

  // Lock body scroll, focus the confirm button, listen for keys.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, handleKey]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in zoom-in-95 fade-in duration-150"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-1">
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              variant === "danger" ? "bg-rose-100 text-rose-600" : "bg-stone-100 text-stone-700"
            )}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-sm font-semibold text-stone-900"
            >
              {title}
            </h3>
            {description && (
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 mt-3 bg-stone-50 border-t border-stone-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 bg-white rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
              variant === "danger"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            {loading && (
              <svg
                className="w-3 h-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
