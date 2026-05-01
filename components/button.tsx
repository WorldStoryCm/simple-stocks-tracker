import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "./component.utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-white border border-transparent shadow-[var(--shadow-glow-brand)] [background-image:linear-gradient(135deg,var(--brand-from),var(--brand-to))] hover:brightness-110 hover:-translate-y-[1px]",
        destructive: "bg-[color:var(--negative)] text-white shadow-sm hover:brightness-110",
        outline: "border border-border bg-transparent text-text-primary hover:border-[color:var(--surface-3)] hover:bg-[color:var(--surface-2)]",
        secondary: "bg-[color:var(--surface-2)] text-text-primary border border-border hover:bg-[color:var(--surface-3)]",
        ghost: "text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary",
        link: "text-[color:var(--info)] underline-offset-4 hover:underline",
        icon: "rounded-[var(--radius)] text-text-secondary hover:bg-[color:var(--surface-2)] hover:text-text-primary",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-[var(--radius)] px-3 text-sm",
        lg: "h-12 rounded-[var(--radius)] px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
