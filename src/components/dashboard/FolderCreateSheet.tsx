"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { FolderItem } from "./FolderFilter";
import { ColorPicker } from "@/components/ui/color-picker";

const FOLDER_COLORS = [
  "#433BFF",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
];

const FOLDER_ICONS = [
  "folder",
  "link",
  "star",
  "heart",
  "bookmark",
  "tag",
  "archive",
  "briefcase",
];

interface FolderCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  folder?: FolderItem | null;
  onSuccess?: () => void;
}

export function FolderCreateSheet({
  open,
  onOpenChange,
  workspaceId,
  folder,
  onSuccess,
}: FolderCreateSheetProps) {
  const [name, setName] = useState(folder?.name || "");
  const [description, setDescription] = useState(folder?.description || "");
  const [color, setColor] = useState(folder?.color || FOLDER_COLORS[0]);
  const [icon, setIcon] = useState(folder?.icon || "folder");
  const [loading, setLoading] = useState(false);

  const isEditing = !!folder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Folder name is required");
      return;
    }

    setLoading(true);

    try {
      const url = isEditing ? `/api/folders/${folder.id}` : "/api/folders";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: name.trim(),
          description: description.trim() || null,
          color,
          icon,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save folder");
      }

      toast.success(isEditing ? "Folder updated" : "Folder created");
      onOpenChange(false);
      onSuccess?.();

      if (!isEditing) {
        setName("");
        setDescription("");
        setColor(FOLDER_COLORS[0]);
        setIcon("folder");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {isEditing ? "Edit Folder" : "Create Folder"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your folder details"
              : "Create a new folder to organize your links"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Marketing Links"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., All marketing and campaign links"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker
                colors={FOLDER_COLORS}
                value={color}
                onChange={setColor}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      icon === iconName
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <FolderIconDisplay name={iconName} color={color} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FolderIconDisplay({ name, color }: { name: string; color: string }) {
  const iconClass = "h-5 w-5";

  switch (name) {
    case "folder":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill={color}>
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>
      );
    case "link":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    case "star":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill={color}>
          <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
        </svg>
      );
    case "heart":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill={color}>
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      );
    case "bookmark":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill={color}>
          <path fillRule="evenodd" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" clipRule="evenodd" />
        </svg>
      );
    case "tag":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path d="M6 6h.008v.008H6V6z" />
        </svg>
      );
    case "archive":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect width="20" height="5" x="2" y="3" rx="1" />
          <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" />
          <path d="M10 12h4" />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill={color}>
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>
      );
  }
}
