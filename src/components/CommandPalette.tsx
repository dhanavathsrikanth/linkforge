"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command";
import { Link2, LayoutDashboard, Settings, Sparkles, Plus, Users, Globe, QrCode } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search links, actions, or jump to..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/links/new"))}>
            <Plus />
            <span>Create new link</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/qr/new"))}>
            <QrCode />
            <span>Create QR Code</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/team/invite"))}>
            <Users />
            <span>Invite team member</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard />
            <span>Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/links"))}>
            <Link2 />
            <span>Links</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/analytics"))}>
            <BarChartIcon />
            <span>Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings/domains"))}>
            <Globe />
            <span>Custom Domains</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
            <Settings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Inline simple icon component since BarChart3 is from lucide but wasn't imported
function BarChartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-bar-chart-3"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
