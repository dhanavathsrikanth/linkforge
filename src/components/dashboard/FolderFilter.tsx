"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/Button";
import {
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FolderCreateSheet } from "./FolderCreateSheet";

export interface FolderItem {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  workspaceId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  linkCount?: number;
}

interface FolderFilterProps {
  folders: FolderItem[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  workspaceId: string;
  onFoldersChange?: () => void;
}

export function FolderFilter({
  folders,
  selectedFolderId,
  onFolderSelect,
  workspaceId,
  onFoldersChange,
}: FolderFilterProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const totalLinks = folders.reduce((sum, f) => sum + (f.linkCount || 0), 0);

  const handleDelete = async (folder: FolderItem) => {
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      toast.success(`Folder "${folder.name}" deleted`);
      if (selectedFolderId === folder.id) {
        onFolderSelect(null);
      }
      onFoldersChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete folder");
    }
    setMenuOpenId(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-2")}
          >
            <Folder className="h-4 w-4" />
            {selectedFolder ? (
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedFolder.color }}
                />
                {selectedFolder.name}
              </span>
            ) : (
              <span>All Links</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => onFolderSelect(null)}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span>All Links</span>
                <span className="text-xs text-muted-foreground">
                  {totalLinks} links
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => onFolderSelect(folder.id)}
                className="gap-2 cursor-pointer"
              >
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: folder.color }}
                />
                <div className="flex flex-1 flex-col">
                  <span>{folder.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {folder.linkCount || 0} links
                  </span>
                </div>
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) setMenuOpenId(folder.id);
                  }}
                >
                  <DropdownMenuTrigger
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 ml-1")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolder(folder);
                        setMenuOpenId(null);
                      }}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(folder);
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setCreateOpen(true)}
              className="gap-2 text-primary focus:text-primary cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FolderCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
        onSuccess={() => {
          onFoldersChange?.();
        }}
      />

      <FolderCreateSheet
        open={!!editingFolder}
        onOpenChange={(open) => !open && setEditingFolder(null)}
        workspaceId={workspaceId}
        folder={editingFolder}
        onSuccess={() => {
          setEditingFolder(null);
          onFoldersChange?.();
        }}
      />
    </>
  );
}
