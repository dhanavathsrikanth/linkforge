"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tags, X, ChevronDown } from "lucide-react";

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

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((link) => {
      link.tags?.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [links]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      const countA = tagCounts[a.name] || 0;
      const countB = tagCounts[b.name] || 0;
      return countB - countA;
    });
  }, [tags, tagCounts]);

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsSelect(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsSelect([...selectedTags, tagName]);
    }
  };

  const handleClearAll = () => {
    onTagsSelect([]);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={selectedTags.length > 0 ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-2"
        >
          <Tags className="h-4 w-4" />
          Tags
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedTags.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
        {sortedTags.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No tags created yet
          </div>
        ) : (
          <>
            {sortedTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              const count = tagCounts[tag.name] || 0;

              return (
                <DropdownMenuItem
                  key={tag.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleTagToggle(tag.name);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: isSelected ? tag.color : "transparent",
                      borderColor: tag.color,
                    }}
                  />
                  <span className="flex-1">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {count}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {selectedTags.length > 0 && (
          <>
            <div className="border-t my-1" />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleClearAll();
                setOpen(false);
              }}
              className="gap-2 cursor-pointer text-muted-foreground focus:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Clear all filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
