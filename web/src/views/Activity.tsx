import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common";
import { Pagination } from "@/components/ui/pagination";
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
  leaktest: "border-purple-500/30 bg-purple-50 text-purple-800 dark:border-purple-500/40 dark:bg-purple-950/40 dark:text-purple-400",
};

const KINDS = [
  { id: "all", label: "All" },
  { id: "connect", label: "Connect" },
  { id: "reconnect", label: "Reconnect" },
  { id: "disconnect", label: "Disconnect" },
  { id: "autoheal", label: "Autoheal" },
  { id: "leaktest", label: "Leak Test" },
] as const;

export function Activity() {
  const { data: events = [] } = useEvents();
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return events.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (!term) return true;
      const hay = [e.name, e.kind, e.detail].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [events, q, kindFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2.5">
          <CardTitle>Fleet Activity Log</CardTitle>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 tabular-nums dark:border-[#262e40] dark:bg-[#121622] dark:text-zinc-300">
            {events.length} {events.length === 1 ? "EVENT" : "EVENTS"}
          </span>
        </div>
      </CardHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-[#1d2230] dark:bg-[#090c12]">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search events by exit, detail, or kind…"
            className="h-8 pl-8 text-xs font-mono"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => {
                setKindFilter(k.id);
                setPage(1);
              }}
              className={cn(
                "rounded-lg border px-3 py-1 font-semibold uppercase tracking-wider transition-colors",
                kindFilter === k.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#202737] dark:bg-[#121622] dark:text-zinc-400 dark:hover:border-[#2f3950] dark:hover:text-zinc-200",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <CardBody className="p-0">
        {!filtered.length ? (
          <EmptyState className="py-12">
            {events.length ? "No events match your filter." : "No activity recorded yet."}
          </EmptyState>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#181d28]">
            {paginated.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-4 px-5 py-3 text-xs font-mono transition-colors hover:bg-slate-50/70 dark:hover:bg-[#121622]/60"
              >
                <span className="w-24 shrink-0 text-slate-400 dark:text-zinc-500 tabular-nums">
                  {fmtTime(Number(e.ts))}
                </span>
                <span className="w-28 shrink-0">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                      TONE[e.kind] ||
                        "border-slate-200 bg-slate-100 text-slate-700 dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-400",
                    )}
                  >
                    {e.kind}
                  </span>
                </span>
                <span className="w-36 shrink-0 font-bold text-slate-900 dark:text-zinc-200">
                  {e.name !== "-" ? e.name : ""}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 flex-1 leading-relaxed">
                  {e.detail}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[15, 30, 50, 100]}
        itemLabel="events"
      />
    </Card>
  );
}
