import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const sectionVariants = cva(
  "flex flex-col items-center gap-10 relative py-14 md:py-[72px]",
  {
    variants: {
      container: {
        default: "container mx-auto px-4 sm:px-6",
        full: "",
        narrow: "max-w-3xl mx-auto px-4 sm:px-6",
      },
      align: {
        start: "items-start",
        center: "items-center",
        end: "items-end",
      },
    },
    defaultVariants: {
      container: "default",
      align: "center",
    },
  }
);

type SectionProps = React.AllHTMLAttributes<HTMLElement> &
  VariantProps<typeof sectionVariants> & {
    as?: React.ElementType;
  };

export function Section({
  className,
  container,
  align,
  as: Component = "section",
  ...props
}: SectionProps) {
  return (
    <Component
      className={sectionVariants({ container, align, className })}
      {...props}
    />
  );
}
