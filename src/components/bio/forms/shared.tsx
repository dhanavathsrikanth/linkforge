"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

// ─── Shared form primitives used by all block edit forms ─────────────────────

// ── Field wrapper ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-stone-600"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function TextInput({ error, className, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
        error ? "border-red-400" : "border-stone-200"
      } ${className ?? ""}`}
    />
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-colors ${
        error ? "border-red-400" : "border-stone-200"
      } ${className ?? ""}`}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ error, options, className, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm rounded-xl border bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
        error ? "border-red-400" : "border-stone-200"
      } ${className ?? ""}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Checkbox row ──────────────────────────────────────────────────────────────

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export function CheckboxRow({ label, checked, onChange, hint }: CheckboxRowProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          checked ? "bg-primary border-primary" : "border-stone-300 bg-white"
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-stone-700">{label}</span>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
    </label>
  );
}

// ── Form footer (Cancel + Save) ───────────────────────────────────────────────

interface FormFooterProps {
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
  /** When false, the Save button is disabled (e.g. failed validation). */
  canSave?: boolean;
}

export function FormFooter({ onCancel, saving, saveLabel = "Save", canSave = true }: FormFooterProps) {
  const disabled = saving || !canSave;
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-stone-200 shrink-0">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
      >
        ← Cancel
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saveLabel}
      </button>
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mt-4 mb-2">
      {children}
    </p>
  );
}

// ── Integration placeholder ───────────────────────────────────────────────────

interface IntegrationPlaceholderProps {
  name: string;
  description: string;
  icon: ReactNode;
}

export function IntegrationPlaceholder({ name, description, icon }: IntegrationPlaceholderProps) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-8 bg-stone-50 rounded-xl border border-stone-200">
      <div className="w-14 h-14 rounded-xl bg-stone-200 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-semibold text-stone-800 mb-1">{name}</p>
      <p className="text-xs text-stone-500 text-pretty">{description}</p>
      <p className="text-xs text-stone-400 mt-3">
        OAuth integration coming soon. Connect via the Integrations tab.
      </p>
    </div>
  );
}
