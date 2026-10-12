import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider tabular-nums uppercase border transition-colors",
  {
    variants: {
      tone: {
        ok: "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:shadow-[0_0_8px_rgba(16,185,129,0.15)]",
        warn: "border-amber-500/30 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400 dark:shadow-[0_0_8px_rgba(245,158,11,0.15)]",
        bad: "border-rose-500/30 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400 dark:shadow-[0_0_8px_rgba(244,63,94,0.15)]",
        muted: "border-slate-200 bg-slate-100 text-slate-600 dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-400",
        accent: "border-sky-500/30 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-400 dark:shadow-[0_0_8px_rgba(56,189,248,0.15)]",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-[7px] rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
