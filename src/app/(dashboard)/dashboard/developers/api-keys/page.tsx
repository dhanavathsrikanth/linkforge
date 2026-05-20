"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertCircle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyType: "secret" | "publishable";
  lastUsedAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"secret" | "publishable">("secret");
  const [creating, setCreating] = useState(false);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/v2/keys");
      const json = await res.json();
      setKeys(json.data || []);
    } catch {
      setError("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v2/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), keyType: newType }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to create key.");
        return;
      }
      setPlaintextKey(json.data.plaintextKey);
      setShowCreate(false);
      setNewName("");
      fetchKeys();
    } catch {
      setError("Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await fetch(`/api/v2/keys/${id}`, { method: "DELETE" });
      fetchKeys();
    } catch {
      setError("Failed to revoke key.");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage API keys for programmatic access to LinkForge.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setPlaintextKey(null); }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Plaintext key display (shown once) */}
      {plaintextKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Key className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Key created successfully</p>
              <p className="mt-1 text-xs text-amber-600">
                Copy this key now. You won&apos;t be able to see it again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded border border-amber-300 bg-amber-100/50 px-3 py-2 text-sm font-mono text-amber-900 break-all">
                  {showKey ? plaintextKey : `${plaintextKey.slice(0, 16)}${"•".repeat(24)}`}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="rounded-lg border border-amber-300 bg-white p-2 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(plaintextKey)}
                  className="rounded-lg border border-amber-300 bg-white p-2 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && !plaintextKey && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">New API Key</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production CLI"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Key Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "secret" | "publishable")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="secret">Secret — Full read/write access</option>
                <option value="publishable">Publishable — Read-only access</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Prefix</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Last Used</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  No API keys yet. Create one to get started.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">{key.keyPrefix}...</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      key.keyType === "secret"
                        ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                    }`}>
                      {key.keyType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 ${
                      key.active ? "text-green-700" : "text-slate-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        key.active ? "bg-green-500" : "bg-slate-300"
                      }`} />
                      {key.active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {key.active && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="rounded-lg p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick reference */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Reference</h3>
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">Authorization: Bearer lf_sk_...</code>
            <span className="ml-2">Secret key — full read/write access</span>
          </div>
          <div>
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">Authorization: Bearer lf_pk_...</code>
            <span className="ml-2">Publishable key — read-only access</span>
          </div>
          <div>
            <span className="font-medium text-slate-900">Base URL: </span>
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">{typeof window !== "undefined" ? window.location.origin : ""}/api/v2</code>
          </div>
        </div>
      </div>
    </div>
  );
}
