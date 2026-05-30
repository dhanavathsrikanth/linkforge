"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Command,
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command";
import { Link2, LayoutDashboard, Settings, Sparkles, Plus, Users, Globe, QrCode, BarChart3, Key } from "lucide-react";

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
    const fromButton = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", fromButton);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", fromButton);
    };
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
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
              <BarChart3 />
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
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings/api-keys"))}>
              <Key />
              <span>API Keys</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

