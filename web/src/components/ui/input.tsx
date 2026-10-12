import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "flex w-full rounded-xl border border-[#232838] bg-[#090c12] px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-inner transition-colors focus-visible:outline-none focus-visible:border-sky-500/80 focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:opacity-50";

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
