"use client";

import { useState } from "react";
import { Field, TextInput, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";

interface YouTubeConfig {
  videoId?: string;
}

function extractVideoId(input: string): string {
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    const v = url.searchParams.get("v");
    if (v) return v;
    const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  } catch {}
  return input.trim();
}

export function YouTubeForm({ config: raw, onSave, onCancel }: BlockFormProps) {
  const init = raw as YouTubeConfig;
  const [input, setInput] = useState(init.videoId ?? "");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const videoId = extractVideoId(input);
    onSave({ videoId });
  }

  const previewId = extractVideoId(input);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="YouTube URL or Video ID"
        htmlFor="yt-video"
        hint="Paste the full URL or just the video ID"
      >
        <TextInput
          id="yt-video"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
          required
        />
      </Field>

      {previewId && previewId.length > 5 && (
        <div className="rounded-xl overflow-hidden border border-stone-200 aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${previewId}`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube preview"
          />
        </div>
      )}

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
