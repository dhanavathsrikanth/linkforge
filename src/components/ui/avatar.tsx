"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({ src, alt, fallback, className, size = "md" }: AvatarProps) {
  const [error, setError] = useState(false);

  if (src && !error) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        onError={() => setError(true)}
        className={cn("rounded-full object-cover shrink-0", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {fallback ?? "?"}
    </div>
  );
}

export function AvatarImage({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return <Avatar src={src} alt={alt} className={className} />;
}

export function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground shrink-0 h-8 w-8 text-xs", className)}>
      {children}
    </div>
  );
}
