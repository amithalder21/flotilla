import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  meta,
  width = "620px",
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: React.ReactNode;
  meta?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm dark:bg-black/75 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-[71] flex h-screen flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl transition-colors dark:border-[#1f2638] dark:bg-[#090c13] dark:text-zinc-100 dark:shadow-[-16px_0_40px_rgba(0,0,0,0.85)]",
            "data-[state=open]:animate-slide-in-right focus:outline-none",
          )}
          style={{ width: `min(${width}, 94vw)` }}
        >
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200/90 bg-slate-50/80 px-5 py-3.5 dark:border-[#1b2130] dark:bg-[#0c1018]">
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="size-2 rounded-full bg-[#ff5f56]" />
              <span className="size-2 rounded-full bg-[#ffbd2e]" />
              <span className="size-2 rounded-full bg-[#27c93f]" />
            </div>
            <Dialog.Title className="ml-1 font-mono text-sm font-bold text-slate-900 dark:text-zinc-100">{title}</Dialog.Title>
            {meta && <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-zinc-400">· {meta}</span>}
            <div className="flex-1" />
            <Dialog.Close className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 shadow-xs dark:border-[#232a3b] dark:bg-[#121622] dark:text-zinc-400 dark:hover:border-[#2f3950] dark:hover:text-zinc-200">
              <X className="size-3.5" /> Close
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
