"use client";

import { useState } from "react";
import { Field, TextInput, Select, FormFooter } from "./shared";
import { FileUpload } from "./FileUpload";
import type { BlockFormProps } from "./formRegistry";

interface ImageConfig {
  src?: string;
  alt?: string;
  caption?: string;
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

export function ImageForm({ config: raw, onSave, onCancel, galleryId, blockId }: BlockFormProps) {
  const init = raw as ImageConfig;
  const [src, setSrc] = useState(init.src ?? "");
  const [alt, setAlt] = useState(init.alt ?? "");
  const [caption, setCaption] = useState(init.caption ?? "");
  const [borderRadius, setBorderRadius] = useState(init.borderRadius ?? "md");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ src, alt, caption, borderRadius });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Image upload — full-width drop zone */}
      <Field label="Image" htmlFor="img-src">
        <FileUpload
          galleryId={galleryId}
          blockId={blockId}
          value={src}
          onChange={setSrc}
          onRemove={() => setSrc("")}
          shape="wide"
          label="Drag & drop or click to upload"
          maxSize={2 * 1024 * 1024}
        />
      </Field>

      <Field label="Alt text" htmlFor="img-alt" hint="Describes the image for screen readers">
        <TextInput
          id="img-alt"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="A photo of..."
        />
      </Field>

      <Field label="Caption (optional)" htmlFor="img-caption">
        <TextInput
          id="img-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Photo caption"
        />
      </Field>

      <Field label="Border radius" htmlFor="img-radius">
        <Select
          id="img-radius"
          value={borderRadius}
          onChange={(e) => setBorderRadius((e.target.value || "md") as NonNullable<ImageConfig["borderRadius"]>)}
          options={[
            { value: "none", label: "None" },
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "Extra large" },
            { value: "full", label: "Full (circle)" },
          ]}
        />
      </Field>

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
