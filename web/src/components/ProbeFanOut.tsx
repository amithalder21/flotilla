import React, { useMemo, useState, useEffect } from "react";
import { Radar, Send, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";
import type { ProbeResult, ProbeRow, Worker } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ProbeFanOutProps {
  workers: Worker[];
  busy: boolean;
  result: ProbeResult | null;
  url: string;
  method: string;
  onSelectRow?: (row: ProbeRow) => void;
}

export function ProbeFanOut({
  workers,
  busy,
  result,
  url,
  method,
  onSelectRow,
}: ProbeFanOutProps) {
  // Online exits that participate in probe
  const onlineWorkers = useMemo(() => {
    return workers.filter((w) => w.exists && w.vpn === "running" && w.health === "healthy");
  }, [workers]);

  const activeList = onlineWorkers.length ? onlineWorkers : workers.filter((w) => w.exists && w.vpn === "running");

  // Map result rows by exit name
  const rowMap = useMemo(() => {
    const map = new Map<string, ProbeRow>();
    if (result?.rows) {
      for (const r of result.rows) {
        map.set(r.exit, r);
      }
    }
    return map;
  }, [result]);

  // Stagger reveal animation for when responses land
  const [revealedExits, setRevealedExits] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (busy) {
      setRevealedExits(new Set());
    } else if (result?.rows && result.rows.length > 0) {
      // Sort rows by latency (ms) so fastest exits light up first!
      const sorted = [...result.rows].sort((a, b) => (a.ms ?? 9999) - (b.ms ?? 9999));
      sorted.forEach((row, index) => {
        const timeout = setTimeout(() => {
          setRevealedExits((prev) => new Set([...prev, row.exit]));
        }, index * 120 + 80);
        return () => clearTimeout(timeout);
      });
    }
  }, [busy, result]);

  // Clean URL hostname extraction
  const displayHost = useMemo(() => {
    if (!url) return "target.example.com";
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      return u.hostname + (u.pathname !== "/" ? u.pathname : "");
    } catch {
      return url.slice(0, 32);
    }
  }, [url]);

  // Fan-out layout geometry
  const width = 880;
  const height = 330;
  const centerX = width / 2;
  const centerY = height - 46; // Place target destination near bottom-center

  const nodePositions = useMemo(() => {
    const count = Math.max(activeList.length, 1);
    // Arc angles from -78 deg to +78 deg for wide spatial separation
    const startAngle = -78 * (Math.PI / 180);
    const endAngle = 78 * (Math.PI / 180);
    const radius = 225;

    return activeList.map((w, idx) => {
      const angle =
        count === 1
          ? 0
          : startAngle + (idx / (count - 1)) * (endAngle - startAngle);
      // Math: x = centerX + radius * sin(angle), y = centerY - radius * cos(angle)
      const x = centerX + radius * Math.sin(angle);
      const y = centerY - radius * Math.cos(angle);
      // Stagger label height between adjacent nodes when > 3 exits to prevent text collision
      const isEven = idx % 2 === 0;
      const labelY = count > 3 ? (isEven ? -24 : -38) : -26;
      return { worker: w, x, y, angle, labelY };
    });
  }, [activeList, centerX, centerY]);

  // Summary counts
  const outliersCount = result?.rows.filter((r) => r.diff === "outlier").length ?? 0;
  const errorsCount = result?.rows.filter((r) => r.diff === "error" || r.error).length ?? 0;
  const matchesCount = result?.rows.filter((r) => r.diff === "same").length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-sm transition-colors dark:border-[#232838] dark:bg-[#0c0f16] dark:text-white dark:shadow-2xl">
      {/* Background Grid Accent */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      
      {/* Top Banner & Mode */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-[#1d2332]">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl border border-sky-500/30 bg-sky-50 text-sky-600 shadow-sm dark:bg-sky-950/40 dark:text-sky-400 dark:shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <Radar className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-200">
                Fleet Radial Fan-Out
              </span>
              <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/80 dark:text-sky-400">
                {activeList.length} EXITS → 1 TARGET
              </span>
            </div>
            <div className="text-[12px] text-slate-500 font-mono dark:text-zinc-400">
              Simultaneous egress probes stream into target over WireGuard/OpenVPN tunnels
            </div>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {busy ? (
            <div className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-50 px-3.5 py-1 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
              </span>
              <span>Streaming probe requests to target across {activeList.length} exits…</span>
            </div>
          ) : result ? (
            <div className="flex items-center gap-3">
              {outliersCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" /> {outliersCount} Differs
                </span>
              )}
              {errorsCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-50 px-3 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  <XCircle className="size-3.5" /> {errorsCount} Unreachable
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> {matchesCount} Consensus Match
              </span>
            </div>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500 dark:border-[#232838] dark:bg-[#141824] dark:text-zinc-400">
              Ready for dispatch
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas with Radial Fan-Out Animation */}
      <div className="relative mx-auto my-3 flex items-center justify-center select-none overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[920px] h-[330px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="rayIdle" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Radial Rays connecting Exit Nodes to Destination Target */}
          {nodePositions.map(({ worker, x, y }) => {
            const row = rowMap.get(worker.name);
            const isRevealed = revealedExits.has(worker.name);

            // Determine ray color & styling based on state
            let rayStroke = "#64748b";
            let rayOpacity = 0.25;
            let rayWidth = 1.5;

            if (busy) {
              rayStroke = "#0284c7";
              rayOpacity = 0.45;
              rayWidth = 2;
            } else if (isRevealed && row) {
              if (row.error || row.diff === "error") {
                rayStroke = "#f43f5e";
              } else if (row.diff === "outlier") {
                rayStroke = "#f59e0b";
              } else {
                rayStroke = "#10b981";
              }
              rayOpacity = 0.9;
              rayWidth = 2;
            }

            return (
              <g key={`ray-${worker.name}`}>
                {/* Background trace line from exit (x, y) to target (centerX, centerY) */}
                <line
                  x1={x}
                  y1={y}
                  x2={centerX}
                  y2={centerY}
                  stroke={rayStroke}
                  strokeWidth={rayWidth}
                  strokeOpacity={rayOpacity}
                />

                {/* Animated active packet stream streaming from Exit to Target */}
                {busy && (
                  <line
                    x1={x}
                    y1={y}
                    x2={centerX}
                    y2={centerY}
                    stroke="#0284c7"
                    className="dark:stroke-sky-400 animate-packets-to-target"
                    strokeWidth={2.5}
                    strokeDasharray="6 16"
                    style={{ filter: "drop-shadow(0 0 5px #38bdf8)" }}
                  />
                )}
              </g>
            );
          })}

          {/* Central Destination Target Node at (centerX, centerY) */}
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Receiving pulse aura */}
            {busy && (
              <circle
                cx="0"
                cy="0"
                r="36"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeOpacity="0.5"
                className="animate-pulse"
              />
            )}
            {/* Base halo */}
            <circle
              cx="0"
              cy="0"
              r="28"
              className={cn(
                "fill-slate-100 stroke-sky-500 dark:fill-[#0f1624] dark:stroke-sky-400 transition-all",
                busy && "animate-pulse"
              )}
              strokeWidth="2.5"
              style={{ filter: "drop-shadow(0 0 12px rgba(56, 189, 248, 0.45))" }}
            />
            {/* Target Reticle ring */}
            <circle
              cx="0"
              cy="0"
              r="18"
              fill="none"
              stroke="#0284c7"
              className={cn("dark:stroke-sky-400", busy && "animate-spin")}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              style={{ animationDuration: "8s" }}
            />
            <circle cx="0" cy="0" r="10" fill="#38bdf8" fillOpacity={busy ? 0.35 : 0.2} />
            <circle cx="0" cy="0" r="5" fill="#0284c7" className="dark:fill-[#38bdf8]" />
            <text
              y="44"
              textAnchor="middle"
              className="fill-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider dark:fill-zinc-300"
            >
              {method} · {displayHost}
            </text>
          </g>

          {/* Exit Nodes on the Arc */}
          {nodePositions.map(({ worker, x, y, labelY }) => {
            const row = rowMap.get(worker.name);
            const isRevealed = revealedExits.has(worker.name);

            // Determine status tone
            let haloColor = "#94a3b8";
            let dotColor = "#64748b";
            let statusLabel = "READY";
            let msText = "";

            if (busy) {
              haloColor = "#0284c7";
              dotColor = "#0284c7";
              statusLabel = "SENDING…";
            } else if (isRevealed && row) {
              msText = row.ms != null ? `${row.ms}ms` : "";
              if (row.error || row.diff === "error") {
                haloColor = "#f43f5e";
                dotColor = "#f43f5e";
                statusLabel = "ERR";
              } else if (row.diff === "outlier") {
                haloColor = "#f59e0b";
                dotColor = "#f59e0b";
                statusLabel = `${row.status || 200} DIFF`;
              } else {
                haloColor = "#10b981";
                dotColor = "#10b981";
                statusLabel = `${row.status || 200} OK`;
              }
            }

            return (
              <g
                key={`node-${worker.name}`}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer transition-transform hover:scale-110"
                onClick={() => row && onSelectRow?.(row)}
              >
                {/* Active Transmitter Ping when broadcasting probe */}
                {busy && (
                  <circle
                    cx="0"
                    cy="0"
                    r="16"
                    fill="none"
                    stroke="#0284c7"
                    className="dark:stroke-sky-400 animate-ping"
                    strokeWidth="1.2"
                    style={{ animationDuration: "1.6s" }}
                  />
                )}

                {/* Outer Glow Halo */}
                <circle
                  cx="0"
                  cy="0"
                  r="20"
                  className="fill-slate-100 dark:fill-[#0e131d]"
                  stroke={haloColor}
                  strokeWidth="2"
                  style={{
                    filter: isRevealed || busy ? `drop-shadow(0 0 8px ${haloColor})` : undefined,
                  }}
                />

                {/* Core Dot */}
                <circle cx="0" cy="0" r="6" fill={dotColor} />

                {/* Exit Label above node (staggered labelY to avoid collisions) */}
                <text
                  y={labelY}
                  textAnchor="middle"
                  className="fill-slate-800 font-mono text-[10.5px] font-bold dark:fill-zinc-200"
                >
                  {worker.name}
                  {worker.ipinfo?.country_iso ? ` [${worker.ipinfo.country_iso}]` : ""}
                </text>

                {/* Status / Latency badge below node */}
                <text
                  y="34"
                  textAnchor="middle"
                  className="font-mono text-[10px] font-semibold"
                  fill={isRevealed || busy ? haloColor : "#94a3b8"}
                >
                  {statusLabel} {msText ? `· ${msText}` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Dispatch Footer */}
      <div className="mt-2 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-mono text-slate-500 dark:border-[#1d2332] dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <Send className="size-3.5 text-sky-500 dark:text-sky-400" />
          <span>Simultaneous egress probes stream into target over WireGuard/OpenVPN tunnels</span>
        </span>
        <span className="text-slate-400 dark:text-zinc-500">
          Click any exit node to open its full HTTP response headers and body
        </span>
      </div>
    </div>
  );
}
