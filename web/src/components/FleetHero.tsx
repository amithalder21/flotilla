import React, { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Network, Zap, ShieldCheck } from "lucide-react";
import type { MetricPoint, Worker } from "@/lib/types";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const EXIT_PALETTE = [
  { hex: "#10b981", rgb: "16, 185, 129", name: "emerald", text: "text-emerald-400" },
  { hex: "#f59e0b", rgb: "245, 158, 11", name: "amber", text: "text-amber-400" },
  { hex: "#38bdf8", rgb: "56, 189, 248", name: "sky", text: "text-sky-400" },
  { hex: "#a855f7", rgb: "168, 85, 247", name: "purple", text: "text-purple-400" },
  { hex: "#f43f5e", rgb: "244, 63, 94", name: "rose", text: "text-rose-400" },
  { hex: "#06b6d4", rgb: "6, 182, 212", name: "cyan", text: "text-cyan-400" },
  { hex: "#84cc16", rgb: "132, 204, 22", name: "lime", text: "text-lime-400" },
  { hex: "#ec4899", rgb: "236, 72, 153", name: "pink", text: "text-pink-400" },
];

export interface FleetHeroProps {
  workers: Worker[];
  metrics: MetricPoint[];
  rate: { t: number; rx: number; tx: number }[];
  onSelectExit?: (workerName: string) => void;
}

export function FleetHero({ workers, metrics, rate, onSelectExit }: FleetHeroProps) {
  // Connected / running workers
  const onlineWorkers = useMemo(() => {
    return workers.filter((w) => w.exists && w.vpn === "running" && w.health === "healthy");
  }, [workers]);

  const allRunning = useMemo(() => {
    return workers.filter((w) => w.exists && w.vpn === "running");
  }, [workers]);

  const displayedWorkers = useMemo(() => {
    // Show up to 6 workers in the diagram for aesthetic balance
    const list = onlineWorkers.length ? onlineWorkers : allRunning;
    return list.slice(0, 6);
  }, [onlineWorkers, allRunning]);

  // Rate calculations
  const nowRate = rate[rate.length - 1];
  const rxRate = nowRate?.rx || 0; // Bytes/sec
  const txRate = nowRate?.tx || 0; // Bytes/sec
  const totalRate = rxRate + txRate;

  // Peak & Average
  const { peakRate, avgRate } = useMemo(() => {
    if (!rate.length) return { peakRate: totalRate, avgRate: totalRate };
    let max = 0;
    let sum = 0;
    for (const r of rate) {
      const tot = r.rx + r.tx;
      if (tot > max) max = tot;
      sum += tot;
    }
    return {
      peakRate: Math.max(max, totalRate),
      avgRate: sum / rate.length,
    };
  }, [rate, totalRate]);

  // Format speed into value and unit
  const formatSpeedSplit = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return { val: "0.0", unit: "KB/s" };
    const mb = bytesPerSec / (1024 * 1024);
    if (mb >= 1) {
      return { val: mb.toFixed(1), unit: "MB/s" };
    }
    const kb = bytesPerSec / 1024;
    return { val: kb.toFixed(1), unit: "KB/s" };
  };

  const totalSpeedFormatted = formatSpeedSplit(totalRate);
  const avgSpeedFormatted = formatSpeedSplit(avgRate);
  const peakSpeedFormatted = formatSpeedSplit(peakRate);

  // Fleet capacity badge calculation
  const multiplierText = useMemo(() => {
    const count = onlineWorkers.length;
    if (count === 0) return "NO ACTIVE TUNNELS";
    if (count === 1) return "1 ACTIVE EGRESS TUNNEL";
    return `${count}× AGGREGATE EGRESS CAPACITY ⇄`;
  }, [onlineWorkers]);

  // Distribute estimated throughput per worker for visual cues
  const totalExitMb = useMemo(() => {
    return displayedWorkers.reduce(
      (acc, w) => acc + (w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0),
      0
    ) || 1;
  }, [displayedWorkers]);

  // Last 30s rate points for the mini chart
  const chartPoints = useMemo(() => {
    const recent = rate.slice(-30);
    if (recent.length < 2) {
      // Mock minimal baseline points if newly started
      return [
        { t: 1, rx: 0, tx: 0 },
        { t: 2, rx: rxRate, tx: txRate },
      ];
    }
    return recent;
  }, [rate, rxRate, txRate]);

  // Diagram geometry: dedicated laser canvas with adjacent node badges
  const svgHeight = Math.max(displayedWorkers.length * 44 + 32, 160);
  const svgWidth = 160;
  const startX = 20;
  const startY = svgHeight / 2;
  const targetX = svgWidth - 10;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#232838] bg-[#0d1017] text-white shadow-2xl">
      {/* Top subtle sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Top Header Row (Hardware Console Style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2433] px-5 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          {/* subtle hardware status indicators */}
          <div className="flex items-center gap-1.5 opacity-70">
            <span className="size-2.5 rounded-full bg-[#ff5f56]" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="size-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Flotilla Fleet Controller
          </span>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span>
            {onlineWorkers.length} {onlineWorkers.length === 1 ? "TUNNEL CONVERGED" : "TUNNELS CONVERGED"}
          </span>
        </div>
      </div>

      {/* Main 3-Column Hero Grid */}
      <div className="grid grid-cols-1 items-center gap-6 px-6 py-6 lg:grid-cols-12">
        {/* ======================================================== */}
        {/* COLUMN 1: Signature Fan-Out Topology Diagram (5 cols)     */}
        {/* ======================================================== */}
        <div className="relative flex flex-col justify-center lg:col-span-5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Network className="size-3.5 text-zinc-400" /> Multi-Egress Dispatch
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {displayedWorkers.length} {displayedWorkers.length === 1 ? "Active Tunnel" : "Active Tunnels"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Left: SVG Connecting Links with Animated Throughput Pulses */}
            <div className="w-[140px] sm:w-[160px] shrink-0">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full select-none"
                style={{ height: svgHeight }}
              >
                <defs>
                  <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="hubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>

                {/* Fan-Out Bezier Curves to each exit */}
                {displayedWorkers.map((w, i) => {
                  const palette = EXIT_PALETTE[i % EXIT_PALETTE.length];
                  const destY =
                    displayedWorkers.length === 1
                      ? svgHeight / 2
                      : 22 + i * ((svgHeight - 44) / (displayedWorkers.length - 1));

                  const controlX1 = startX + (targetX - startX) * 0.45;
                  const controlX2 = startX + (targetX - startX) * 0.55;
                  const pathD = `M ${startX} ${startY} C ${controlX1} ${startY}, ${controlX2} ${destY}, ${targetX} ${destY}`;

                  return (
                    <g key={w.name}>
                      {/* Underlying static trace line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={palette.hex}
                        strokeWidth="1.75"
                        strokeOpacity="0.22"
                        strokeDasharray="4 4"
                      />

                      {/* Active throughput flowing laser beam */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={palette.hex}
                        strokeWidth="2.2"
                        strokeDasharray="8 20"
                        className="animate-flow-dash"
                        style={{
                          filter: `drop-shadow(0 0 4px ${palette.hex})`,
                          animationDuration: totalRate > 500000 ? "1s" : "2s",
                        }}
                      />

                      {/* Exit Node Pin on the right end */}
                      <circle
                        cx={targetX}
                        cy={destY}
                        r="3.5"
                        fill={palette.hex}
                        style={{ filter: `drop-shadow(0 0 5px ${palette.hex})` }}
                      />
                    </g>
                  );
                })}

                {/* Central Control Hub Node on the left */}
                <g transform={`translate(${startX}, ${startY})`}>
                  {/* Pulsing radar rings */}
                  <circle
                    cx="0"
                    cy="0"
                    r="13"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                    className="animate-ping"
                    style={{ animationDuration: "3s" }}
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="9"
                    fill="#0e1726"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))" }}
                  />
                  <circle cx="0" cy="0" r="4" fill="#38bdf8" />
                </g>
              </svg>
            </div>

            {/* Right: Exit Nodes Detail Badges (Dedicated column, no text/laser overlap) */}
            <div
              className="flex flex-1 flex-col justify-between py-1"
              style={{ height: svgHeight }}
            >
              {displayedWorkers.map((w, i) => {
                const palette = EXIT_PALETTE[i % EXIT_PALETTE.length];
                const workerShare =
                  ((w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0)) / totalExitMb;
                const estimatedSpeed = totalRate * (workerShare || 1 / displayedWorkers.length);
                const speedStr = formatSpeedSplit(estimatedSpeed);

                return (
                  <div
                    key={w.name}
                    onClick={() => onSelectExit?.(w.name)}
                    className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#1a2130] bg-[#0c1018]/90 px-2.5 py-1 transition-all hover:border-[#2a354c] hover:bg-[#121722]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: palette.hex, boxShadow: `0 0 6px ${palette.hex}` }}
                      />
                      <span className="truncate font-mono text-[11px] font-bold text-zinc-200 group-hover:text-white">
                        {w.name}
                      </span>
                      {w.ipinfo?.country_iso && (
                        <span className="shrink-0 rounded bg-[#18202e] px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-zinc-400">
                          {w.ipinfo.country_iso}
                        </span>
                      )}
                    </div>
                    <span className={cn("shrink-0 font-mono text-[10.5px] tabular-nums font-semibold", palette.text)}>
                      {speedStr.val} {speedStr.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: Mega Throughput Stat Counter (3 cols)          */}
        {/* ======================================================== */}
        <div className="flex flex-col items-start justify-center border-y border-[#1f2433] py-4 lg:col-span-3 lg:border-x lg:border-y-0 lg:px-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            FLEET THROUGHPUT
          </div>

          <div className="mt-1 flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-mono text-4xl xl:text-5xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_0_18px_rgba(255,255,255,0.15)]">
              {totalSpeedFormatted.val}
            </span>
            <span className="font-mono text-xs xl:text-sm font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap shrink-0">
              {totalSpeedFormatted.unit}
            </span>
          </div>

          {/* Sub Stats: AVG & PEAK */}
          <div className="mt-2.5 flex items-center gap-2 font-mono text-[11px] text-zinc-400 tabular-nums whitespace-nowrap">
            <span>
              AVG <strong className="text-zinc-200">{avgSpeedFormatted.val} {avgSpeedFormatted.unit}</strong>
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              PEAK <strong className="text-zinc-200">{peakSpeedFormatted.val} {peakSpeedFormatted.unit}</strong>
            </span>
          </div>

          {/* Concurrency Multiplier Pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#1f3e30] bg-[#0c2219] px-2.5 py-1 text-[11px] font-mono font-semibold tracking-wide text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)] whitespace-nowrap">
            <Zap className="size-3.5 text-emerald-400 shrink-0" />
            <span>{multiplierText}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: Stacked Live Throughput Area Graph (4 cols)    */}
        {/* ======================================================== */}
        <div className="flex flex-col justify-center lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              LIVE TRAFFIC · LAST 30S
            </span>
            <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-400" /> INGRESS (RX)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-400" /> EGRESS (TX)
              </span>
            </div>
          </div>

          {/* Recharts Stacked Area Graph */}
          <div className="h-[128px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 4, right: 2, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="fleetRxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="fleetTxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121620",
                    borderColor: "#262d3d",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                  formatter={(value: number, name) => [
                    `${fmtBytes(value)}/s`,
                    name === "rx" ? "Ingress Traffic (RX)" : "Egress Traffic (TX)",
                  ]}
                  labelFormatter={() => ""}
                />
                <Area
                  type="monotone"
                  dataKey="rx"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#fleetRxGradient)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="tx"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#fleetTxGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Live Data summary */}
          <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] text-zinc-400 tabular-nums">
            <span>
              INGRESS <strong className="text-emerald-400">{fmtBytes(rxRate)}/s</strong>
            </span>
            <span>
              EGRESS <strong className="text-amber-400">{fmtBytes(txRate)}/s</strong>
            </span>
            <span className="text-zinc-400">
              FLEET TOTAL <strong className="text-zinc-200">{fmtBytes(totalRate)}/s</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
