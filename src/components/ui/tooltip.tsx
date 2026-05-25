"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children, content, delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50">
          <div className="bg-popover text-popover-foreground text-xs rounded-md px-2.5 py-1.5 shadow-md border border-border whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export function TooltipTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex", className)}>{children}</span>;
}

export function TooltipContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-popover text-popover-foreground text-xs rounded-md px-2.5 py-1.5 shadow-md border border-border", className)}>
      {children}
    </div>
  );
}
