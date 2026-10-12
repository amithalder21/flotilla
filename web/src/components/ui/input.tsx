import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus-visible:outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/20 disabled:opacity-50 dark:border-[#232838] dark:bg-[#090c12] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:shadow-inner dark:focus-visible:border-sky-500/80 dark:focus-visible:ring-sky-500/40";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(base, "min-h-[96px] resize-y font-mono text-[13px] leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "h-9 cursor-pointer pr-8", className)} {...props} />
));
Select.displayName = "Select";
