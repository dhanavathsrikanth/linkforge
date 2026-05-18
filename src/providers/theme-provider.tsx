"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { type PropsWithChildren } from "react";

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return;
    orig.apply(console, args);
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
    return (
        <NextThemeProvider disableTransitionOnChange attribute="class" value={{ light: "light-mode", dark: "dark-mode" }}>
            {children}
        </NextThemeProvider>
    );
}
