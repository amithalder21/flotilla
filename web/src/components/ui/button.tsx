import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-[0_0_14px_rgba(16,185,129,0.25)] border border-emerald-500/50",
        secondary:
          "border border-[#252c3e] bg-[#141822] text-zinc-200 hover:bg-[#1a202e] hover:border-[#343e56] hover:text-white shadow-sm",
        ghost: "text-zinc-400 hover:bg-[#161b26] hover:text-zinc-200",
        danger:
          "border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white hover:border-rose-500/70",
        accent:
          "bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-[0_0_14px_rgba(56,189,248,0.25)] border border-sky-400/40",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[13px]",
        xs: "h-7 px-2.5 text-[12.5px] rounded-[7px]",
        icon: "h-8 w-8 rounded-md",
        "icon-sm": "h-[30px] w-[30px] rounded-md",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
