"use client";

import { Copy, Edit3, Trash2, ExternalLink, BarChart2, X } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { RealtimeClicks } from "../analytics/RealtimeClicks";

export function LinkCard({ link }: { link: any }) {
  const [copied, setCopied] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const shortUrl = `https://linkforge.app/${link.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#141418] p-5 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate text-base font-semibold text-white">
                {link.title || link.destination.replace(/^https?:\/\//, '')}
              </h3>
              {link.password && (
                <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400 border border-orange-500/20">
                  Protected
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <a 
                href={shortUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                linkforge.app/{link.slug}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-zinc-600">•</span>
              <span className="truncate text-zinc-400">
                {link.destination}
              </span>
            </div>

            {link.tags && link.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {link.tags.map((tag: string) => (
                  <span 
                    key={tag}
                    className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button 
              onClick={handleCopy}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setAnalyticsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 transition-colors"
              title="Analytics"
            >
              <BarChart2 className="h-4 w-4" />
            </button>
            <button 
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button 
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-6 border-t border-white/5 pt-4 text-sm">
          <button 
            onClick={() => setAnalyticsOpen(true)}
            className="flex items-center gap-2 text-zinc-400 hover:text-violet-400 transition-colors"
          >
            <BarChart2 className="h-4 w-4 text-zinc-500" />
            <span className="font-medium text-zinc-300">{link.totalClicks || 0}</span> clicks
          </button>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="font-medium text-zinc-300">{new Date(link.createdAt).toLocaleDateString()}</span> created
          </div>
        </div>
      </div>

      <Dialog.Root open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-xl border border-white/10 bg-[#09090b] p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Dialog.Title className="text-xl font-bold text-white">
                  Analytics for /{link.slug}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-zinc-400 mt-1">
                  View real-time traffic and performance data.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <RealtimeClicks slug={link.slug} />

            <div className="mt-8 flex justify-end">
              <Dialog.Close asChild>
                <button className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

