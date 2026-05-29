"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, TextInput, FormFooter } from "./shared";
import { ImageOrUrlInput } from "./ImageOrUrlInput";
import type { BlockFormProps } from "./formRegistry";

interface StackItem {
  title: string;
  label?: string;
  link?: string;
  icon: { src: string };
}

interface StackConfig {
  title?: string;
  label?: string;
  items?: StackItem[];
}

const DEFAULT_ITEM: StackItem = { title: "", label: "", link: "", icon: { src: "" } };

export function StackForm({ config: raw, onSave, onCancel, galleryId, blockId }: BlockFormProps) {
  const init = raw as StackConfig;
  const [title, setTitle] = useState(init.title ?? "");
  const [label, setLabel] = useState(init.label ?? "");
  const [items, setItems] = useState<StackItem[]>(
    init.items?.length ? init.items : []
  );
  const [saving, setSaving] = useState(false);

  function updateItem(i: number, patch: Partial<StackItem>) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function updateItemIcon(i: number, src: string) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, icon: { src } } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...DEFAULT_ITEM }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ title, label, items });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title" htmlFor="stack-title">
        <TextInput
          id="stack-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Built With"
          required
        />
      </Field>

      <Field label="Subtitle (optional)" htmlFor="stack-label">
        <TextInput
          id="stack-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My tech stack"
        />
      </Field>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600">Item {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <Field label="Name" htmlFor={`stack-item-title-${i}`}>
              <TextInput
                id={`stack-item-title-${i}`}
                value={item.title}
                onChange={(e) => updateItem(i, { title: e.target.value })}
                placeholder="React"
                required
              />
            </Field>

            <Field label="Description (optional)" htmlFor={`stack-item-label-${i}`}>
              <TextInput
                id={`stack-item-label-${i}`}
                value={item.label ?? ""}
                onChange={(e) => updateItem(i, { label: e.target.value })}
                placeholder="UI framework"
              />
            </Field>

            <Field label="Link (optional)" htmlFor={`stack-item-link-${i}`}>
              <TextInput
                id={`stack-item-link-${i}`}
                value={item.link ?? ""}
                onChange={(e) => updateItem(i, { link: e.target.value })}
                placeholder="https://react.dev"
                type="url"
              />
            </Field>

            {/* Icon — Upload or URL */}
            <Field label="Icon">
              <ImageOrUrlInput
                galleryId={galleryId}
                blockId={blockId}
                value={item.icon.src}
                onChange={(src) => updateItemIcon(i, src)}
                shape="square"
                uploadLabel="Upload icon"
                urlPlaceholder="https://cdn.example.com/icon.svg"
                id={`stack-item-icon-${i}`}
              />
            </Field>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      </div>

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}
