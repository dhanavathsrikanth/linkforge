"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, TextInput, FormFooter } from "./shared";
import { ImageOrUrlInput } from "./ImageOrUrlInput";
import type { BlockFormProps } from "./formRegistry";

interface LinkBarLink {
  link: string;
  icon: { src: string };
  label?: string;
}

interface LinkBarConfig {
  links?: LinkBarLink[];
}

const DEFAULT_LINK: LinkBarLink = { link: "https://", icon: { src: "" }, label: "" };

export function LinkBarForm({ config: raw, onSave, onCancel, galleryId, blockId }: BlockFormProps) {
  const init = raw as LinkBarConfig;
  const [links, setLinks] = useState<LinkBarLink[]>(
    init.links?.length ? init.links : [{ ...DEFAULT_LINK }]
  );
  const [saving, setSaving] = useState(false);

  function updateLink(i: number, patch: Partial<LinkBarLink>) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function updateIcon(i: number, src: string) {
    setLinks((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, icon: { src } } : l))
    );
  }

  function addLink() {
    setLinks((prev) => [...prev, { ...DEFAULT_LINK }]);
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ links });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {links.map((link, i) => (
        <div key={i} className="flex flex-col gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Link {i + 1}</span>
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <Field label="URL" htmlFor={`lbar-link-${i}`}>
            <TextInput
              id={`lbar-link-${i}`}
              value={link.link}
              onChange={(e) => updateLink(i, { link: e.target.value })}
              placeholder="https://twitter.com/..."
              type="url"
              required
            />
          </Field>

          {/* Icon — Gallery, Upload, or URL */}
          <Field label="Icon">
            <ImageOrUrlInput
              galleryId={galleryId}
              blockId={blockId}
              value={link.icon.src}
              onChange={(src) => updateIcon(i, src)}
              shape="square"
              uploadLabel="Upload icon"
              urlPlaceholder="https://cdn.example.com/icon.svg"
              id={`lbar-icon-${i}`}
            />
          </Field>

          <Field label="Label (optional)" htmlFor={`lbar-label-${i}`}>
            <TextInput
              id={`lbar-label-${i}`}
              value={link.label ?? ""}
              onChange={(e) => updateLink(i, { label: e.target.value })}
              placeholder="Twitter"
            />
          </Field>
        </div>
      ))}

      <button
        type="button"
        onClick={addLink}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add link
      </button>

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
