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
  const width = 840;
  const height = 320;
  const centerX = width / 2;
  const centerY = height - 50; // Place origin near bottom-center for arc fan-out

  const nodePositions = useMemo(() => {
    const count = Math.max(activeList.length, 1);
    // Arc angles from -75 deg to +75 deg
    const startAngle = -75 * (Math.PI / 180);
    const endAngle = 75 * (Math.PI / 180);
    const radius = 220;

    return activeList.map((w, idx) => {
      const angle =
        count === 1
          ? 0
          : startAngle + (idx / (count - 1)) * (endAngle - startAngle);
      // Math: x = centerX + radius * sin(angle), y = centerY - radius * cos(angle)
      const x = centerX + radius * Math.sin(angle);
      const y = centerY - radius * Math.cos(angle);
      return { worker: w, x, y, angle };
    });
  }, [activeList, centerX, centerY]);

  // Summary counts
  const outliersCount = result?.rows.filter((r) => r.diff === "outlier").length ?? 0;
  const errorsCount = result?.rows.filter((r) => r.diff === "error" || r.error).length ?? 0;
  const matchesCount = result?.rows.filter((r) => r.diff === "same").length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#232838] bg-[#0c0f16] p-6 text-white shadow-2xl">
      {/* Background Grid Accent */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      
      {/* Top Banner & Mode */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#1d2332] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <Radar className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-200">
                Fleet Radial Fan-Out
              </span>
              <span className="rounded bg-sky-950/80 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-sky-400 border border-sky-800/50">
                1 REQUEST → {activeList.length} EXITS
              </span>
            </div>
            <div className="text-[12px] text-zinc-400 font-mono">
              Simultaneous dispatch across every egress node with diff verification
            </div>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {busy ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/40 px-3.5 py-1 text-amber-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
              </span>
              <span>Radiating waves to {activeList.length} exits…</span>
            </div>
          ) : result ? (
            <div className="flex items-center gap-3">
              {outliersCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/40 px-3 py-1 text-amber-400">
                  <AlertTriangle className="size-3.5" /> {outliersCount} Differs
                </span>
              )}
              {errorsCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/40 px-3 py-1 text-rose-400">
                  <XCircle className="size-3.5" /> {errorsCount} Unreachable
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-emerald-400">
                <CheckCircle2 className="size-3.5" /> {matchesCount} Consensus Match
              </span>
            </div>
          ) : (
            <span className="rounded-full border border-[#232838] bg-[#141824] px-3 py-1 text-zinc-400">
              Ready for dispatch
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas with Radial Fan-Out Animation */}
      <div className="relative mx-auto my-3 flex items-center justify-center select-none overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[900px] h-[320px]"
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

          {/* Radiating Radar Ripple Rings from Center when Busy */}
          {busy && (
            <g transform={`translate(${centerX}, ${centerY})`}>
              <circle
                cx="0"
                cy="0"
                r="60"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                className="animate-ping"
                style={{ animationDuration: "1.4s" }}
              />
              <circle
                cx="0"
                cy="0"
                r="120"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
                className="animate-ping"
                style={{ animationDuration: "2s" }}
              />
              <circle
                cx="0"
                cy="0"
                r="180"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="0.8"
                className="animate-ping"
                style={{ animationDuration: "2.8s" }}
              />
            </g>
          )}

          {/* Radial Rays connecting Origin to each Exit */}
          {nodePositions.map(({ worker, x, y }) => {
            const row = rowMap.get(worker.name);
            const isRevealed = revealedExits.has(worker.name);

            // Determine ray color & styling based on state
            let rayStroke = "#2b3448";
            let rayOpacity = 0.4;
            let rayWidth = 1.5;

            if (busy) {
              rayStroke = "#38bdf8";
              rayOpacity = 0.85;
              rayWidth = 2.5;
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
                {/* Background path line */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke={rayStroke}
                  strokeWidth={rayWidth}
                  strokeOpacity={rayOpacity}
                  strokeDasharray={busy ? "6 8" : undefined}
                  className={busy ? "animate-flow-dash" : undefined}
                  style={busy ? { filter: "drop-shadow(0 0 4px #38bdf8)" } : undefined}
                />
              </g>
            );
          })}

          {/* Central Origin Node at (centerX, centerY) */}
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Base halo */}
            <circle
              cx="0"
              cy="0"
              r="28"
              fill="#0f1624"
              stroke="#38bdf8"
              strokeWidth="2"
              style={{ filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))" }}
            />
            <circle cx="0" cy="0" r="14" fill="#38bdf8" fillOpacity="0.2" />
            <circle cx="0" cy="0" r="6" fill="#38bdf8" />
            <text
              y="44"
              textAnchor="middle"
              className="fill-zinc-300 font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              {method} · {displayHost}
            </text>
          </g>

          {/* Exit Nodes on the Arc */}
          {nodePositions.map(({ worker, x, y }) => {
            const row = rowMap.get(worker.name);
            const isRevealed = revealedExits.has(worker.name);

            // Determine status tone
            let haloColor = "#262f42";
            let dotColor = "#4b5563";
            let statusLabel = "READY";
            let msText = "";

            if (busy) {
              haloColor = "#38bdf8";
              dotColor = "#38bdf8";
              statusLabel = "DISPATCHING…";
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
                {/* Outer Glow Halo */}
                <circle
                  cx="0"
                  cy="0"
                  r="20"
                  fill="#0e131d"
                  stroke={haloColor}
                  strokeWidth="2"
                  style={{
                    filter: isRevealed || busy ? `drop-shadow(0 0 8px ${haloColor})` : undefined,
                  }}
                />

                {/* Core Dot */}
                <circle cx="0" cy="0" r="6" fill={dotColor} />

                {/* Exit Label above node */}
                <text
                  y="-26"
                  textAnchor="middle"
                  className="fill-zinc-200 font-mono text-[11px] font-bold"
                >
                  {worker.name}
                  {worker.ipinfo?.country_iso ? ` [${worker.ipinfo.country_iso}]` : ""}
                </text>

                {/* Status / Latency badge below node */}
                <text
                  y="34"
                  textAnchor="middle"
                  className="font-mono text-[10px] font-semibold"
                  fill={isRevealed || busy ? haloColor : "#71717a"}
                >
                  {statusLabel} {msText ? `· ${msText}` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Dispatch Footer */}
      <div className="mt-2 flex flex-wrap items-center justify-between border-t border-[#1d2332] pt-3 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-2">
          <Send className="size-3.5 text-sky-400" />
          <span>Payload dispatched over raw WireGuard/OpenVPN tunnel sockets</span>
        </span>
        <span className="text-zinc-500">
          Click any exit node to open its full HTTP response headers and body
        </span>
      </div>
    </div>
  );
}
