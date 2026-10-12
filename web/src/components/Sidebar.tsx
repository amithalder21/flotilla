import { Activity, Clock3, LayoutGrid, Radar, Server, Settings, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewId = "overview" | "connections" | "run" | "probe" | "schedules" | "activity" | "settings";

const NAV: { id: ViewId; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "connections", label: "Connections", icon: Server },
  { id: "run", label: "Run script", icon: Terminal },
  { id: "probe", label: "Probe", icon: Radar },
  { id: "schedules", label: "Schedules", icon: Clock3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-[17px]">
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="6" cy="6" r="1.8" />
      <circle cx="18" cy="6" r="1.8" />
      <circle cx="12" cy="19.5" r="1.8" />
      <path d="M10.2 10.2 7.3 7.3M13.8 10.2l2.9-2.9M12 14.6v3.1" />
    </svg>
  );
}

export function Sidebar({
  view,
  setView,
  issues,
  connState,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  issues: number;
  connState: { kind: "live" | "err" | "wait"; text: string };
}) {
  const dotColor = {
    live: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    err: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
    wait: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
  }[connState.kind];

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-[#1a1f2c] bg-[#07090e] text-white">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-5 border-b border-[#141822]">
        <span className="grid size-8 place-items-center rounded-xl bg-emerald-950/60 text-emerald-400 ring-1 ring-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <BrandMark />
        </span>
        <div className="leading-tight">
          <div className="font-mono text-[14px] font-bold tracking-tight text-zinc-100">Flotilla</div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Fleet Control Core</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-3 font-mono text-xs">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all text-left",
                active
                  ? "bg-[#141924] font-bold text-white border border-[#232b3d] shadow-sm"
                  : "text-zinc-400 hover:bg-[#11141c] hover:text-zinc-200 border border-transparent",
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} strokeWidth={2} />
              <span className="tracking-wide uppercase text-[11px] font-semibold">{label}</span>
              {id === "connections" && issues > 0 && (
                <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-950/80 border border-rose-500/50 px-1 font-mono text-[10px] font-bold text-rose-400">
                  {issues}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Status Indicator */}
      <div className="border-t border-[#141822] px-5 py-3.5">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span className={cn("size-2 rounded-full", dotColor)} />
          <span className="uppercase tracking-wider text-[11px] font-medium">{connState.text}</span>
        </span>
      </div>
    </aside>
  );
}
