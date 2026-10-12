import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm border border-emerald-600/80 dark:border-emerald-500/50 dark:shadow-[0_0_14px_rgba(16,185,129,0.25)]",
        secondary:
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm dark:border-[#252c3e] dark:bg-[#141822] dark:text-zinc-200 dark:hover:bg-[#1a202e] dark:hover:border-[#343e56] dark:hover:text-white dark:shadow-none",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#161b26] dark:hover:text-zinc-200",
        danger:
          "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 dark:hover:text-white dark:hover:border-rose-500/70",
        accent:
          "bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm border border-sky-500/80 dark:border-sky-400/40 dark:shadow-[0_0_14px_rgba(56,189,248,0.25)]",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[13px]",
        xs: "h-7 px-2.5 text-[12px] rounded-md",
        icon: "h-8 w-8 rounded-lg",
        "icon-sm": "h-7 w-7 rounded-md",
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
