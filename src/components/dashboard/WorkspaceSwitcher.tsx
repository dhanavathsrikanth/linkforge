"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { useOrganization, useOrganizationList, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { PlanBadge } from "@/components/billing/PlanBadge";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { workspace, isLoading } = useWorkspace();
  const { organization } = useOrganization();
  const { setActive } = useClerk();
  const { userMemberships, isLoaded: listLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const orgs =
    listLoaded && userMemberships?.data
      ? userMemberships.data.map((m) => m.organization)
      : [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
          {workspace && !workspace.isPersonal ? (
            <span className="text-xs font-bold text-primary">
              {workspace.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate">
            {isLoading
              ? "Loading…"
              : workspace
                ? workspace.isPersonal
                  ? "Personal Workspace"
                  : workspace.name
                : "Select workspace"}
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setActive?.({ organization: null });
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
              !organization && "bg-muted/50"
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">Personal Workspace</div>
              {workspace && workspace.isPersonal && (
                <PlanBadge plan={workspace.plan} />
              )}
            </div>
            {!organization && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </button>

          {orgs.length > 0 && (
            <>
              <div className="my-1 border-t border-border" />
              {orgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    setActive?.({ organization: org });
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                    organization?.id === org.id && "bg-muted/50"
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <span className="text-xs font-bold text-primary">
                      {org.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{org.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {org.membersCount} {org.membersCount === 1 ? "member" : "members"}
                    </div>
                  </div>
                  {organization?.id === org.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
