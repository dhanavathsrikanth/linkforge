import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/design-system/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-800",
        primary: "bg-[#433BFF] text-white hover:bg-[#3730E6]",
        secondary: "bg-[#DEDCFF] text-[#433BFF] hover:bg-[#D4D2F8]",
        success: "bg-[#27CE7A] text-white hover:bg-[#22B869]",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-slate-200 text-slate-950 hover:bg-slate-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
