import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken, setToken } from "@/lib/api";
import { useWorkers } from "@/lib/hooks";
import { Sidebar, type ViewId } from "@/components/Sidebar";
import { Toaster } from "@/components/Toaster";
import { TokenGate } from "@/components/TokenGate";
import { ThemeProvider, ThemeToggle } from "@/lib/theme";
import { Overview } from "@/views/Overview";
import { Connections } from "@/views/Connections";
import { Run } from "@/views/Run";
import { Probe } from "@/views/Probe";
import { Schedules } from "@/views/Schedules";
import { Activity } from "@/views/Activity";
import { Settings } from "@/views/Settings";

const META: Record<ViewId, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Fleet telemetry & control" },
  connections: { title: "Connections", sub: "Active egress tunnels" },
  run: { title: "Run script", sub: "Distributed fleet execution" },
  probe: { title: "Probe", sub: "Multi-exit HTTP inspection" },
  schedules: { title: "Schedules", sub: "Automated recurring jobs" },
  activity: { title: "Activity", sub: "Fleet audit events" },
  settings: { title: "Settings", sub: "Control configuration" },
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#080a0f] text-slate-900 dark:text-zinc-100 transition-colors">
      <Sidebar view={view} setView={setView} issues={issues} connState={connState} />
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <header className="shrink-0 z-20 flex h-[58px] items-center justify-between border-b border-slate-200/80 bg-white/80 dark:border-[#1a1f2d] dark:bg-[#080a0f]/90 px-6 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-zinc-100">
              {m.title}
            </h1>
            <span className="hidden font-mono text-xs text-slate-400 dark:text-zinc-500 sm:inline">
              / {m.sub}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
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

  return (
    <ThemeProvider>
      {!authed ? (
        <>
          <TokenGate
            onAuthed={() => {
              qc.invalidateQueries();
              setAuthed(true);
            }}
          />
          <Toaster />
        </>
      ) : (
        <Shell onDeauth={() => setAuthed(false)} />
      )}
    </ThemeProvider>
  );
}
