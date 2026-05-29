"use client";

import { useState } from "react";
import { Field, TextInput, Textarea, Select, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";

interface ContentConfig {
  title?: string;
  content?: string;
  alignment?: "left" | "center" | "right";
}

export function ContentForm({ config: raw, onSave, onCancel }: BlockFormProps) {
  const init = raw as ContentConfig;
  const [title, setTitle] = useState(init.title ?? "");
  const [content, setContent] = useState(init.content ?? "");
  const [alignment, setAlignment] = useState<"left" | "center" | "right">(init.alignment ?? "left");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ title, content, alignment });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title" htmlFor="content-title">
        <TextInput
          id="content-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Section title"
        />
      </Field>

      <Field label="Content" htmlFor="content-body">
        <Textarea
          id="content-body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something..."
          rows={5}
        />
      </Field>

      <Field label="Alignment" htmlFor="content-align">
        <Select
          id="content-align"
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
