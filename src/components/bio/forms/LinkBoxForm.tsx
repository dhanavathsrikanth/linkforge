"use client";

import { useState } from "react";
import { Field, TextInput, CheckboxRow, FormFooter } from "./shared";
import { ImageOrUrlInput } from "./ImageOrUrlInput";
import type { BlockFormProps } from "./formRegistry";

interface LinkBoxConfig {
  title?: string;
  label?: string;
  link?: string;
  icon?: { src: string };
  showPreview?: boolean;
}

export function LinkBoxForm({ config: raw, onSave, onCancel, galleryId, blockId }: BlockFormProps) {
  const init = raw as LinkBoxConfig;
  const [title, setTitle] = useState(init.title ?? "");
  const [label, setLabel] = useState(init.label ?? "");
  const [link, setLink] = useState(init.link ?? "https://");
  const [iconSrc, setIconSrc] = useState(init.icon?.src ?? "");
  const [showPreview, setShowPreview] = useState(init.showPreview ?? false);
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ title, label, link, icon: { src: iconSrc }, showPreview });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title" htmlFor="lb-title">
        <TextInput
          id="lb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Website"
          required
        />
      </Field>

      <Field label="Label" htmlFor="lb-label">
        <TextInput
          id="lb-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Check this out"
        />
      </Field>

      <Field label="URL" htmlFor="lb-link">
        <TextInput
          id="lb-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://example.com"
          type="url"
          required
        />
      </Field>

      {/* Icon — Upload or URL */}
      <Field label="Icon">
        <ImageOrUrlInput
          galleryId={galleryId}
          blockId={blockId}
          value={iconSrc}
          onChange={setIconSrc}
          shape="square"
          uploadLabel="Upload icon"
          urlPlaceholder="https://cdn.example.com/icon.svg"
          id="lb-icon"
        />
      </Field>

      <CheckboxRow
        label="Show website preview"
        hint="Displays a screenshot of the linked page"
        checked={showPreview}
        onChange={setShowPreview}
      />

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
