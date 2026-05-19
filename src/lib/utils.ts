import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultDomain() {
  if (typeof window !== "undefined") {
    return window.location.host;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return appUrl.replace(/^https?:\/\//, "");
}
