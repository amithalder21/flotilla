import { useMemo } from "react";
import { ArrowDown, ArrowUp, Globe2, Radio, Server, Waves } from "lucide-react";
import type { ViewId } from "@/components/Sidebar";
import { Card, CardBody, CardHeader, CardSub, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Donut, HBars, Sparkline, ThroughputChart } from "@/components/charts";
import { WorldMap } from "@/components/WorldMap";
import { EmptyState } from "@/components/common";
import { FleetHero } from "@/components/FleetHero";
import { ActivityStrip } from "@/components/ActivityStrip";
import { useMetrics, useWorkers } from "@/lib/hooks";
import { fmtBytes, fmtRate } from "@/lib/format";
import type { MetricPoint, Worker } from "@/lib/types";

function rates(m: MetricPoint[]): { t: number; rx: number; tx: number }[] {
  const out: { t: number; rx: number; tx: number }[] = [];
  for (let i = 1; i < m.length; i++) {
    const dt = m[i].ts - m[i - 1].ts || 1;
    const rx = Math.max(0, ((m[i].rx - m[i - 1].rx) * 1e6) / dt);
    const tx = Math.max(0, ((m[i].tx - m[i - 1].tx) * 1e6) / dt);
    out.push({ t: m[i].ts, rx, tx });
  }
  return out;
}

function Kpi({
  label,
  icon: Icon,
  value,
  unit,
  spark,
  color = "#38bdf8",
}: {
  label: string;
  icon: typeof Server;
  value: React.ReactNode;
  unit?: string;
  spark: number[];
  color?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#212637] bg-[#0d1017] p-4 text-white shadow-lg transition-transform hover:-translate-y-0.5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <span className="grid size-7 place-items-center rounded-lg border border-[#262f42] bg-[#121622] text-zinc-300">
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl lg:text-3xl font-extrabold tracking-tight tabular-nums text-white">
          {value}
        </span>
        {unit && <span className="font-mono text-xs font-semibold text-zinc-400">{unit}</span>}
      </div>
      <div className="mt-2 h-8 px-0.5">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  );
}

export function Overview({ setView }: { setView: (v: ViewId) => void }) {
  const { data: workers = [] } = useWorkers();
  const { data: metrics = [] } = useMetrics();

  const rate = useMemo(() => rates(metrics), [metrics]);
  const last = metrics[metrics.length - 1];
  const nowRate = rate[rate.length - 1];

  // one bucket per worker, by priority
  const buckets = { connected: 0, connecting: 0, attention: 0, stopped: 0 };
  const connected: Worker[] = [];
  for (const w of workers) {
    const running = w.exists && w.vpn === "running";
    if (w.gaveup || (running && w.health === "unhealthy")) buckets.attention++;
    else if (!running) buckets.stopped++;
    else if (w.health === "healthy") {
      buckets.connected++;
      connected.push(w);
    } else buckets.connecting++;
  }
  const issues = workers.filter((w) => w.gaveup || (w.vpn === "running" && w.health === "unhealthy"));
  const countries = new Set(connected.map((w) => w.ipinfo?.country_iso).filter(Boolean)).size;
  const totalData = last ? (last.rx + last.tx) * 1e6 : 0;

  if (!workers.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-8 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Server className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold tracking-tight">Welcome to Flotilla</h2>
        <p className="mt-1.5 max-w-sm text-[13px] text-muted-foreground">
          No exits yet. Add one or more <b>.ovpn</b> profiles to see your fleet live on the map and dashboard.
        </p>
        <Button variant="primary" className="mt-5" onClick={() => setView("connections")}>
          Add connections
        </Button>
      </div>
    );
  }

  const barRows = [...connected]
    .map((w) => ({ w, total: (w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(({ w, total }) => ({
      label: w.name,
      value: total,
      sub: fmtBytes(total * 1e6),
      color: "hsl(var(--accent))",
    }));

  return (
    <div className="flex flex-col gap-5">
      {/* Signature Fleet Hero: Multi-egress topology dispatch, aggregate throughput, and stacked traffic chart */}
      <FleetHero
        workers={workers}
        metrics={metrics}
        rate={rate}
        onSelectExit={() => setView("connections")}
      />

      {/* Per-Exit Activity Strip: Segmented-block matrix & live throughput shares */}
      <ActivityStrip
        workers={workers}
        nowRate={nowRate}
        onSelectExit={() => setView("connections")}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Connections" icon={Server} value={workers.length} spark={metrics.map((m) => m.conns)} />
        <Kpi label="Online" icon={Radio} value={connected.length} spark={metrics.map((m) => m.healthy)} color="hsl(var(--ok))" />
        <Kpi label="Regions" icon={Globe2} value={countries} spark={metrics.map((m) => m.countries)} color="hsl(var(--accent))" />
        <Kpi label="Data moved" icon={Waves} value={fmtBytes(totalData)} spark={rate.map((r) => r.rx + r.tx)} color="hsl(var(--accent))" />
      </div>

      {/* World Map */}
      <Card>
        <CardHeader>
          <CardTitle>Exit map</CardTitle>
          <CardSub>where your tunnels egress</CardSub>
        </CardHeader>
        <CardBody>
          <WorldMap workers={workers} />
        </CardBody>
      </Card>

      {/* Donut & Cumulative Bars */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fleet status</CardTitle>
          </CardHeader>
          <CardBody>
            {workers.length ? (
              <Donut
                slices={[
                  { label: "Connected", value: buckets.connected, color: "hsl(var(--ok))" },
                  { label: "Connecting", value: buckets.connecting, color: "hsl(var(--warn))" },
                  { label: "Needs attention", value: buckets.attention, color: "hsl(var(--bad))" },
                  { label: "Stopped", value: buckets.stopped, color: "hsl(var(--muted-foreground))" },
                ]}
              />
            ) : (
              <EmptyState>No connections yet.</EmptyState>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data by exit</CardTitle>
            <CardSub>top 8 · cumulative</CardSub>
          </CardHeader>
          <CardBody>
            {barRows.length ? <HBars rows={barRows} /> : <EmptyState>No traffic yet.</EmptyState>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

