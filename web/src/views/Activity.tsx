import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common";
import { useEvents } from "@/lib/hooks";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  connect: "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-400",
  reconnect: "border-sky-500/30 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-400",
  renamed: "border-sky-500/30 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-400",
  disconnect: "border-slate-200 bg-slate-100 text-slate-700 dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-400",
  shutdown: "border-slate-200 bg-slate-100 text-slate-700 dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-400",
  autoheal: "border-amber-500/30 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-400",
  gaveup: "border-rose-500/30 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-400",
  "heal-error": "border-rose-500/30 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-400",
};

export function Activity() {
  const { data: events = [] } = useEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Activity Log</CardTitle>
      </CardHeader>
      <CardBody className="max-h-[72vh] overflow-auto px-5 py-2">
        {!events.length ? (
          <EmptyState>No activity recorded yet.</EmptyState>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-[#181d28]">
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-4 py-3 text-xs font-mono">
                <span className="w-24 shrink-0 text-slate-400 dark:text-zinc-500 tabular-nums">
                  {fmtTime(Number(e.ts))}
                </span>
                <span className="w-28 shrink-0">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                      TONE[e.kind] || "border-slate-200 bg-slate-100 text-slate-700 dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-400"
                    )}
                  >
                    {e.kind}
                  </span>
                </span>
                <span className="w-36 shrink-0 font-bold text-slate-900 dark:text-zinc-200">
                  {e.name !== "-" ? e.name : ""}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 flex-1">{e.detail}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
