import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { typographyVariants } from "@/lib/design-system/utils";

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as: Component = "p", ...props }, ref) => {
    return (
      <Component
        className={typographyVariants({ variant, className })}
        ref={ref}
        {...(props as any)}
      />
    );
  }
);

Typography.displayName = "Typography";

export { Typography, typographyVariants };
