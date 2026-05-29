"use client";

import { useState } from "react";
import { Field, Textarea, Select, FormFooter } from "./shared";
import { FileUpload } from "./FileUpload";
import type { BlockFormProps } from "./formRegistry";

interface HeaderConfig {
  title?: string;
  description?: string;
  avatar?: { src: string };
  alignment?: "left" | "center" | "right";
}

export function HeaderForm({ config: raw, onSave, onCancel, galleryId, blockId }: BlockFormProps) {
  const init = raw as HeaderConfig;
  const [title, setTitle] = useState(init.title ?? "");
  const [description, setDescription] = useState(init.description ?? "");
  const [avatarSrc, setAvatarSrc] = useState(init.avatar?.src ?? "");
  const [alignment, setAlignment] = useState<"left" | "center" | "right">(init.alignment ?? "left");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ title, description, avatar: { src: avatarSrc }, alignment });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Avatar upload */}
      <Field label="Avatar" htmlFor="header-avatar">
        <FileUpload
          galleryId={galleryId}
          blockId={blockId}
          value={avatarSrc}
          onChange={setAvatarSrc}
          onRemove={() => setAvatarSrc("")}
          shape="avatar"
          label="Upload avatar photo"
          maxSize={2 * 1024 * 1024}
        />
      </Field>

      <Field label="Name / Title" htmlFor="header-title">
        <input
          id="header-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Hello World"
          required
          className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Field>

      <Field label="Bio / Subtitle" htmlFor="header-desc">
        <Textarea
          id="header-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Welcome to your new page"
          rows={3}
        />
      </Field>

      <Field label="Alignment" htmlFor="header-align">
        <Select
          id="header-align"
          value={alignment}
          onChange={(e) => setAlignment(e.target.value as "left" | "center" | "right")}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </Field>

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
