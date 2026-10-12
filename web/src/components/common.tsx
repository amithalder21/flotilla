import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Worker } from "@/lib/types";

export function CountryChip({ iso, country }: { iso?: string | null; country?: string | null }) {
  if (!iso && !country) return <span className="text-slate-400 dark:text-zinc-500 font-mono">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {iso && (
        <span className="inline-grid h-5 min-w-[30px] place-items-center rounded-[5px] border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-bold uppercase leading-none tracking-wider text-slate-700 dark:border-[#262e40] dark:bg-[#121622] dark:text-zinc-300">
          [{iso}]
        </span>
      )}
      {country && <span className="text-[12.5px] text-slate-700 font-medium dark:text-zinc-200">{country}</span>}
    </span>
  );
}

export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("py-10 text-center font-mono text-xs text-slate-500 dark:text-zinc-400", className)}>{children}</div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-2xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </div>
  );
}

/** Live status label for a worker row. */
export function statusOf(w: Worker): { tone: "ok" | "warn" | "bad" | "muted"; label: string } {
  if (w.gaveup) return { tone: "bad", label: "Needs attention" };
  if (!w.exists || w.vpn !== "running")
    return { tone: "muted", label: w.vpn === "exited" ? "Disconnected" : "Stopped" };
  if (w.health === "healthy") return { tone: "ok", label: "Connected" };
  if (w.health === "unhealthy") return { tone: "bad", label: "Unhealthy" };
  return { tone: "warn", label: "Connecting" };
}

export function StatusPill({ w }: { w: Worker }) {
  const s = statusOf(w);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function DiffBadge({ diff }: { diff?: string }) {
  const map: Record<string, { tone: "ok" | "warn" | "muted"; label: string }> = {
    same: { tone: "ok", label: "match" },
    outlier: { tone: "warn", label: "differs" },
    unique: { tone: "muted", label: "unique" },
    error: { tone: "muted", label: "unreachable" },
  };
  const v = map[diff || ""] || { tone: "muted" as const, label: diff || "" };
  return (
    <Badge tone={v.tone} dot>
      {v.label}
    </Badge>
  );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] tabular", className)}>{children}</span>;
}
