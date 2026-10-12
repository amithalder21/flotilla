import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken, setToken } from "@/lib/api";
import { useWorkers } from "@/lib/hooks";
import { Sidebar, type ViewId } from "@/components/Sidebar";
import { Toaster } from "@/components/Toaster";
import { TokenGate } from "@/components/TokenGate";
import { Overview } from "@/views/Overview";
import { Connections } from "@/views/Connections";
import { Run } from "@/views/Run";
import { Probe } from "@/views/Probe";
import { Schedules } from "@/views/Schedules";
import { Activity } from "@/views/Activity";
import { Settings } from "@/views/Settings";

const META: Record<ViewId, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Fleet at a glance" },
  connections: { title: "Connections", sub: "Your exits, live" },
  run: { title: "Run script", sub: "Execute across every exit" },
  probe: { title: "Probe", sub: "Compare a request from every exit" },
  schedules: { title: "Schedules", sub: "Recurring jobs" },
  activity: { title: "Activity", sub: "What the fleet has been doing" },
  settings: { title: "Settings", sub: "Token, auto-heal, proxy pool" },
};

function Shell({ onDeauth }: { onDeauth: () => void }) {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewId>("overview");
  const { data: workers = [], isError, error, isLoading } = useWorkers();

  useEffect(() => {
    if (isError && (error as any)?.status === 401) {
      setToken("");
      onDeauth();
    }
  }, [isError, error, onDeauth]);

  const issues = workers.filter((w) => w.gaveup || (w.vpn === "running" && w.health === "unhealthy")).length;
  const connState = isError
    ? { kind: "err" as const, text: "disconnected" }
    : isLoading
      ? { kind: "wait" as const, text: "connecting…" }
      : { kind: "live" as const, text: "connected" };

  const m = META[view];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080a0f] text-zinc-100">
      <Sidebar view={view} setView={setView} issues={issues} connState={connState} />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <header className="shrink-0 z-20 flex h-[58px] items-center justify-between border-b border-[#1a1f2d] bg-[#080a0f] px-8">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-sm font-bold tracking-wider uppercase text-zinc-100">{m.title}</h1>
            <span className="hidden font-mono text-xs text-zinc-500 sm:inline">/ {m.sub}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-emerald-400">
              CORE v1.0
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto w-full max-w-[1400px]">
            {view === "overview" && <Overview setView={setView} />}
            {view === "connections" && <Connections />}
            {view === "run" && <Run />}
            {view === "probe" && <Probe />}
            {view === "schedules" && <Schedules />}
            {view === "activity" && <Activity />}
            {view === "settings" && <Settings />}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const qc = useQueryClient();

  if (!authed) {
    return (
      <>
        <TokenGate
          onAuthed={() => {
            qc.invalidateQueries();
            setAuthed(true);
          }}
        />
        <Toaster />
      </>
    );
  }
  return <Shell onDeauth={() => setAuthed(false)} />;
}
