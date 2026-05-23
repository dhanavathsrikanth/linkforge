"use client";

import { useState } from "react";
import { Plus, Tag, X, Loader2 } from "lucide-react";

type UTMTemplate = {
  id: string;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  isDefault: boolean;
};

const emptyForm = { name: "", source: "", medium: "", campaign: "", term: "", content: "" };

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function UTMTemplatesClient({ workspaceId, initialTemplates }: { workspaceId: string, initialTemplates: UTMTemplate[] }) {
  const [templates, setTemplates] = useState<UTMTemplate[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const template: UTMTemplate = {
        id: generateId(),
        name: form.name.trim(),
        source: form.source.trim(),
        medium: form.medium.trim(),
        campaign: form.campaign.trim(),
        term: form.term.trim(),
        content: form.content.trim(),
        isDefault: templates.length === 0,
      };
      const res = await fetch("/api/v1/utm-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, template }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates);
        setShowForm(false);
        setForm(emptyForm);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">UTM Templates</h1>
          <p className="text-slate-500 mt-1">Pre-configure UTM parameters to quickly apply them when creating short links.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#433BFF] text-white rounded-lg hover:bg-[#3730E6] transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      <div className="grid gap-4 mt-8">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <div className="h-12 w-12 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
              <Tag className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-950">No templates yet</h3>
            <p className="text-slate-500 text-center max-w-md mt-1 mb-6 text-sm">
              Create your first UTM template to save time and enforce consistency when generating links for your campaigns.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex justify-between items-center hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-950">{t.name}</h3>
                  {t.isDefault && (
                    <span className="bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 font-mono">
                  ?utm_source={t.source || 'N/A'}&utm_medium={t.medium || 'N/A'}&utm_campaign={t.campaign || 'N/A'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-950">New UTM Template</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Social Campaign"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="e.g. twitter"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medium</label>
                  <input
                    type="text"
                    value={form.medium}
                    onChange={(e) => setForm({ ...form, medium: e.target.value })}
                    placeholder="e.g. social"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign</label>
                <input
                  type="text"
                  value={form.campaign}
                  onChange={(e) => setForm({ ...form, campaign: e.target.value })}
                  placeholder="e.g. spring_sale"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
                  <input
                    type="text"
                    value={form.term}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                    placeholder="e.g. keyword"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                  <input
                    type="text"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="e.g. hero_banner"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#433BFF] rounded-lg hover:bg-[#3730E6] transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
