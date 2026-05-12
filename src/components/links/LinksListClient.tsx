"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Check, ExternalLink, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useClipboard } from "@/hooks/use-clipboard";
import { QuickCreateBar } from "./QuickCreateBar";
import { AdvancedCreateSheet } from "./AdvancedCreateSheet";

type LinkRow = {
  id: string;
  slug: string;
  destination: string;
  title: string | null;
  tags: string[];
  totalClicks: number;
  createdAt: string | Date;
  isActive?: boolean;
};

type Props = {
  workspaceId: string;
  initialLinks: LinkRow[];
  defaultDomain?: string;
};

export function LinksListClient({
  workspaceId,
  initialLinks,
  defaultDomain = "linkforge.app",
}: Props) {
  const router = useRouter();
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedPrefill, setAdvancedPrefill] = useState<{ destination?: string; slug?: string }>(
    {},
  );
  const { copied, copy } = useClipboard();

  function handleCreated(link: any) {
    setLinks((prev) => [link as LinkRow, ...prev.filter((l) => l.id !== link.id)]);
    setNewIds((prev) => new Set(prev).add(link.id));
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(link.id);
        return next;
      });
    }, 6000);
    // Reconcile with server in the background.
    router.refresh();
  }

  function openAdvanced(prefill: { destination?: string; slug?: string }) {
    setAdvancedPrefill(prefill);
    setAdvancedOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Links</h1>
          <p className="text-sm text-muted-foreground">
            Manage your short links and track their performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAdvanced({})}
          className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Link
        </button>
      </div>

      {/* Quick create */}
      <QuickCreateBar
        workspaceId={workspaceId}
        defaultDomain={defaultDomain}
        onCreated={handleCreated}
        onAdvanced={openAdvanced}
      />

      {/* List */}
      {links.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Create your first link</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Paste a URL above to instantly shorten it, or click Create Link for advanced options.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Title / Destination</th>
                <th className="px-5 py-3 font-semibold">Short link</th>
                <th className="px-5 py-3 text-right font-semibold">Clicks</th>
                <th className="px-5 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {links.map((link) => {
                  const shortUrl = `https://${defaultDomain}/${link.slug}`;
                  const isNew = newIds.has(link.id);
                  const isCopied = copied === link.id;
                  return (
                    <motion.tr
                      key={link.id}
                      layout
                      initial={isNew ? { opacity: 0, y: -8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="border-b border-border last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-foreground">
                            {link.title || link.destination.replace(/^https?:\/\//, "")}
                          </p>
                          {isNew && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-500"
                            >
                              New
                            </motion.span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {link.destination}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copy(shortUrl, link.id)}
                            className="group inline-flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1 font-mono text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                            title="Click to copy"
                          >
                            {defaultDomain}/{link.slug}
                            <span className="text-muted-foreground group-hover:text-primary">
                              {isCopied ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </span>
                          </button>
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold">
                        {link.totalClicks ?? 0}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Advanced sheet */}
      <AdvancedCreateSheet
        workspaceId={workspaceId}
        defaultDomain={defaultDomain}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        prefill={advancedPrefill}
        onCreated={handleCreated}
      />

      {/* Toast (transient) */}
      <AnimatePresence>
        {copied && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground shadow-lg"
          >
            <Check className="h-4 w-4 text-emerald-500" />
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
