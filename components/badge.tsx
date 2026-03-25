import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/component.utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "rounded-full",
    "px-2.5 py-0.5",
    "text-xs font-medium leading-none",
    "whitespace-nowrap",
    "shrink-0 w-fit",
    "gap-1",
    "[&>svg]:size-3 [&>svg]:shrink-0",
    "transition-colors",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",

        secondary: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",

        destructive: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",

        success: "bg-success/10 text-success ring-1 ring-inset ring-success/20",

        warning: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/20",

        info: "bg-info/10 text-info ring-1 ring-inset ring-info/20",

        outline: "bg-transparent text-foreground ring-1 ring-inset ring-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
