import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common";
import { useEvents } from "@/lib/hooks";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  connect: "border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
  reconnect: "border-sky-500/40 bg-sky-950/40 text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.15)]",
  renamed: "border-sky-500/40 bg-sky-950/40 text-sky-400",
  disconnect: "border-[#252c3c] bg-[#141822] text-zinc-400",
  shutdown: "border-[#252c3c] bg-[#141822] text-zinc-400",
  autoheal: "border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
  gaveup: "border-rose-500/40 bg-rose-950/40 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.15)]",
  "heal-error": "border-rose-500/40 bg-rose-950/40 text-rose-400",
};

export function Activity() {
  const { data: events = [] } = useEvents();
  return (
    <Card>
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2.5">
          <CardTitle>Fleet Activity Log</CardTitle>
          <span className="rounded-full border border-[#252c3c] bg-[#141822] px-2.5 py-0.5 font-mono text-[10.5px] text-zinc-400 uppercase tracking-wider">
            AUDIT STREAM
          </span>
        </div>
      </CardHeader>
      <CardBody className="max-h-[72vh] overflow-auto px-5 py-2">
        {!events.length ? (
          <EmptyState>No activity recorded yet — connects, actions, and auto-heals stream here.</EmptyState>
        ) : (
          <div className="flex flex-col divide-y divide-[#181d28]">
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-4 py-3 text-xs font-mono">
                <span className="w-24 shrink-0 text-zinc-500 tabular-nums">{fmtTime(Number(e.ts))}</span>
                <span className="w-28 shrink-0">
                  <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider border", TONE[e.kind] || "border-[#252c3c] bg-[#141822] text-zinc-400")}>
                    {e.kind}
                  </span>
                </span>
                <span className="w-36 shrink-0 font-bold text-zinc-200">{e.name !== "-" ? e.name : ""}</span>
                <span className="text-zinc-400 flex-1">{e.detail}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
