import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-sm transition-colors",
        "dark:border-[#212637] dark:bg-[#0d1017] dark:text-zinc-100 dark:shadow-xl",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-200 dark:before:via-white/15 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 border-b border-slate-200/80 px-5 py-3.5 dark:border-[#1d2230]",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-[13px] font-mono font-bold tracking-wide uppercase text-slate-900 dark:text-zinc-200",
        className
      )}
      {...props}
    />
  );
}

export function CardSub({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-[11.5px] font-mono text-slate-500 dark:text-zinc-500", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
