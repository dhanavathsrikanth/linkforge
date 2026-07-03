import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingContainerVariants = cva("flex flex-col gap-3", {
  variants: {
    align: {
      center: "items-center self-center",
      left: "items-start self-start",
      right: "items-end self-end",
    },
  },
  defaultVariants: {
    align: "center",
  },
});

type HeadingProps = {
  children: React.ReactNode;
  tag?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  title?: string;
  align?: "center" | "left" | "right";
} & VariantProps<typeof headingContainerVariants>;

export function Heading({
  tag,
  subtitle,
  className,
  align = "center",
  ...props
}: HeadingProps) {
  return (
    <div className={headingContainerVariants({ align, className })}>
      {tag ? <Tag>{tag}</Tag> : null}
      <div
        className={cn(
          "flex max-w-[800px] flex-col justify-center gap-1",
          align === "center" && "items-center self-center text-center",
          align === "left" && "items-start self-start text-left",
          align === "right" && "items-end self-end text-right"
        )}
      >
        <Slot
          className={cn(
            "text-pretty text-3xl font-semibold tracking-tight md:text-4xl",
            "text-text-primary"
          )}
          {...props}
        />
      </div>
      {subtitle ? (
        <p
          className={cn(
            "max-w-prose text-pretty text-lg font-light md:text-xl",
            "text-text-tertiary",
            align === "center" && "text-center",
            align === "left" && "text-left",
            align === "right" && "text-right"
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Tag({
  className,
  children,
  ...props
}: React.AllHTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-7 items-center justify-center gap-2 rounded-full px-3.5 pb-px text-sm font-medium",
        "bg-bg-brand-primary text-text-brand-tertiary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
