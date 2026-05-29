"use client";

import { useState } from "react";
import { Field, TextInput, Select, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";

interface SpotifyEmbedConfig {
  embedUrl?: string;
  type?: "track" | "playlist" | "album";
}

export function SpotifyEmbedForm({ config: raw, onSave, onCancel }: BlockFormProps) {
  const init = raw as SpotifyEmbedConfig;
  const [embedUrl, setEmbedUrl] = useState(init.embedUrl ?? "");
  const [type, setType] = useState<"track" | "playlist" | "album">(init.type ?? "track");
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ embedUrl, type });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Spotify URL"
        htmlFor="spotify-url"
        hint="Paste a Spotify track, playlist, or album URL"
      >
        <TextInput
          id="spotify-url"
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="https://open.spotify.com/track/..."
          type="url"
          required
        />
      </Field>

      <Field label="Type" htmlFor="spotify-type">
        <Select
          id="spotify-type"
          value={type}
          onChange={(e) => setType(e.target.value as "track" | "playlist" | "album")}
          options={[
            { value: "track", label: "Track" },
            { value: "playlist", label: "Playlist" },
            { value: "album", label: "Album" },
          ]}
        />
      </Field>

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
