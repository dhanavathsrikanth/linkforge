import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {}

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[var(--ds-rounded-md)] border border-[var(--ds-border-strong)] bg-[var(--ds-surface)] px-3 py-2 text-[var(--ds-text-body-sm)] transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus-visible:border-[var(--ds-primary)] focus-visible:ring-3 focus-visible:ring-[var(--ds-primary)]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--ds-neutral-100)] disabled:opacity-50 aria-invalid:border-[var(--ds-error)] aria-invalid:ring-3 aria-invalid:ring-[var(--ds-error)]/20 md:text-sm dark:bg-[var(--ds-dark-800)] dark:border-[var(--ds-dark-600)] dark:placeholder:text-[var(--ds-dark-600)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
