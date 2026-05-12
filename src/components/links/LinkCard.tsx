"use client";

import { Copy, Edit3, Trash2, ExternalLink, BarChart2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
      <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-[#DEDCFF] hover:shadow-lg hover:shadow-[#433BFF]/10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate text-base font-semibold text-slate-950">
                {link.title || link.destination.replace(/^https?:\/\//, '')}
              </h3>
              {link.password && (
                <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">
                  Protected
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <a 
                href={shortUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-[#433BFF] hover:text-[#3730E6] transition-colors"
              >
                linkforge.app/{link.slug}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-slate-400">•</span>
              <span className="truncate text-slate-500">
                {link.destination}
              </span>
            </div>

            {link.tags && link.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {link.tags.map((tag: string) => (
                  <span 
                    key={tag}
                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200"
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
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950 transition-colors"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setAnalyticsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F7FF] text-[#433BFF] hover:bg-[#DEDCFF] hover:text-[#3730E6] transition-colors"
              title="Analytics"
            >
              <BarChart2 className="h-4 w-4" />
            </button>
            <button 
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950 transition-colors"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button 
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-6 border-t border-slate-200 pt-4 text-sm">
          <button 
            onClick={() => setAnalyticsOpen(true)}
            className="flex items-center gap-2 text-slate-500 hover:text-[#433BFF] transition-colors"
          >
            <BarChart2 className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-700">{link.totalClicks || 0}</span> clicks
          </button>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-medium text-slate-700">{new Date(link.createdAt).toLocaleDateString()}</span> created
          </div>
        </div>
      </div>

      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analytics for /{link.slug}</DialogTitle>
            <DialogDescription>
              View real-time traffic and performance data.
            </DialogDescription>
          </DialogHeader>

          <RealtimeClicks slug={link.slug} />

          <div className="mt-8 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setAnalyticsOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

