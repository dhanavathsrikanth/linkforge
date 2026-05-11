"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b]/80 px-6 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Workspace Switcher would go here */}
        <div className="text-sm font-medium text-zinc-400">
          Personal Workspace
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500 border-2 border-[#09090b]"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-white/10 ring-2 ring-white/5 overflow-hidden">
          <UserButton 
            afterSignOutUrl="/" 
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
                userButtonPopoverCard: "bg-[#141418] border border-white/10 text-white",
                userPreviewSecondaryIdentifier: "text-zinc-400",
                userButtonPopoverActionButton: "hover:bg-white/5 text-zinc-300",
                userButtonPopoverActionButtonIcon: "text-zinc-400",
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
