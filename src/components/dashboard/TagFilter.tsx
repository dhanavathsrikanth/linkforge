"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { Tags, X, ChevronDown, Search, Check } from "lucide-react";

export interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TagFilterProps {
  tags: TagItem[];
  selectedTags: string[];
  onTagsSelect: (tags: string[]) => void;
  links?: Array<{ tags?: string[] }>;
}

export function TagFilter({
  tags,
  selectedTags,
  onTagsSelect,
  links = [],
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((link) => {
      link.tags?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [links]);

  const processedTags = useMemo(() => {
    const scored = tags.map((t) => ({
      ...t,
      count: tagCounts[t.name] || 0,
      isSelected: selectedTags.includes(t.name),
      score: (tagCounts[t.name] || 0) * 100 + (selectedTags.includes(t.name) ? 10000 : 0),
    }));
    return scored.sort((a, b) => b.score - a.score);
  }, [tags, tagCounts, selectedTags]);

  const filteredTags = useMemo(() => {
    if (!query.trim()) return processedTags;
    const q = query.toLowerCase();
    return processedTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [processedTags, query]);

  const toggleTag = (name: string) => {
    if (selectedTags.includes(name)) {
      onTagsSelect(selectedTags.filter((t) => t !== name));
    } else {
      onTagsSelect([...selectedTags, name]);
    }
  };

  const clearAll = () => onTagsSelect([]);

  const selectedPreview = tags.filter((t) => selectedTags.includes(t.name));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          buttonVariants({ variant: selectedTags.length > 0 ? "secondary" : "outline", size: "sm" }),
          "h-8 gap-1.5 relative"
        )}
      >
        <Tags className="h-4 w-4 shrink-0" />
        <span className="shrink-0">Tags</span>
        {selectedTags.length > 0 && (
          <Badge variant="secondary" className="ml-0.5 px-1.5 py-0.5 text-xs leading-none shrink-0">
            {selectedTags.length}
          </Badge>
        )}
        {selectedPreview.length > 0 && selectedPreview.length <= 2 && (
          <div className="flex -space-x-1 ml-0.5">
            {selectedPreview.map((t) => (
              <span
                key={t.id}
                className="w-2 h-2 rounded-full ring-1 ring-background"
                style={{ backgroundColor: t.color }}
              />
            ))}
          </div>
        )}
        <ChevronDown className={cn("h-3 w-3 ml-0.5 opacity-60 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1.5 w-72 z-50 overflow-hidden rounded-xl border bg-popover shadow-lg ring-1 ring-foreground/5"
          >
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tags..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
              {filteredTags.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {query ? "No tags match" : "No tags yet"}
                </div>
              ) : (
                filteredTags.map((tag) => {
                  const isSelected = tag.isSelected;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                        isSelected && "bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-transparent"
                            : "border-muted-foreground/30"
                        )}
                        style={isSelected ? { backgroundColor: tag.color } : undefined}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span
                        className="w-2 h-2 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate">{tag.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{tag.count}</span>
                    </button>
                  );
                })
              )}
            </div>

            {selectedTags.length > 0 && (
              <div className="flex items-center justify-between border-t px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {selectedTags.length} selected
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
