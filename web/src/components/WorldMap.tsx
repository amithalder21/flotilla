import { useEffect, useMemo, useState } from "react";
import { Globe2, Radio, Server, Activity, ShieldCheck } from "lucide-react";
import type { Worker } from "@/lib/types";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "./common";

interface MapData {
  w: number;
  h: number;
  land: string;
  cents: Record<string, [number, number]>;
}

let cache: MapData | null = null;

export interface RegionGroup {
  iso: string;
  country: string;
  count: number;
  online: number;
  workers: Worker[];
  totalBytes: number;
  x: number;
  y: number;
  labelDx: number;
  labelDy: number;
}

export function WorldMap({
  workers,
  onSelectExit,
}: {
  workers: Worker[];
  onSelectExit?: (workerName: string) => void;
}) {
  const [map, setMap] = useState<MapData | null>(cache);
  const [failed, setFailed] = useState(false);
  const [hoveredIso, setHoveredIso] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    fetch(`${import.meta.env.BASE_URL}mapdata.json`, { cache: "force-cache" })
      .then((r) => r.json())
      .then((d: MapData) => {
        cache = d;
        setMap(d);
      })
      .catch(() => setFailed(true));
  }, []);

  // Compute region groups with full metadata and coordinates
  const located = useMemo(() => {
    if (!map) return [];
    const g: Record<string, { iso: string; country: string; count: number; online: number; workers: Worker[]; totalBytes: number }> = {};

    for (const w of workers) {
      const iso = w.ipinfo?.country_iso?.toLowerCase();
      if (!iso) continue;
      if (!g[iso]) {
        g[iso] = {
          iso,
          country: w.ipinfo?.country || iso.toUpperCase(),
          count: 0,
          online: 0,
          workers: [],
          totalBytes: 0,
        };
      }
      g[iso].count++;
      g[iso].workers.push(w);
      g[iso].totalBytes += ((w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0)) * 1e6;
      if (w.exists && w.vpn === "running" && w.health === "healthy") {
        g[iso].online++;
      }
    }

    const list: RegionGroup[] = [];
    for (const item of Object.values(g)) {
      if (!map.cents[item.iso]) continue;
      const [x, y] = map.cents[item.iso];
      list.push({
        ...item,
        x,
        y,
        labelDx: 0,
        labelDy: -20,
      });
    }

    // Smart Collision Resolution for closely spaced geographic neighbors (e.g. JP & KR, EU neighbors)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If distance between markers is closer than 48 units in map coordinate space
        if (dist < 48) {
          if (a.x < b.x) {
            a.labelDx = -26;
            a.labelDy = -18;
            b.labelDx = 26;
            b.labelDy = -18;
          } else {
            a.labelDx = 26;
            a.labelDy = -18;
            b.labelDx = -26;
            b.labelDy = -18;
          }
        }
      }
    }

    return list;
  }, [workers, map]);

  if (failed) return <EmptyState>Map unavailable.</EmptyState>;
  if (!map) return <EmptyState>Loading hardware telemetry map…</EmptyState>;

  const activeGroup = hoveredIso ? located.find((r) => r.iso === hoveredIso) : null;

  return (
    <div className="relative w-full select-none">
      {/* Outer Tactical Radar Container */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 p-2 shadow-sm dark:border-[#1f2638] dark:bg-gradient-to-b dark:from-[#080b12] dark:via-[#0b0f18] dark:to-[#080b12]">
        {/* Subtle Vignette & Grid Backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-radial-grid opacity-15 dark:opacity-25" />

        <svg
          viewBox={`0 42 ${map.w} 356`}
          preserveAspectRatio="xMidYMid meet"
          className="relative mx-auto block h-auto max-h-[340px] w-full"
          role="img"
          aria-label="World map of exit locations"
        >
          <defs>
            {/* Emerald Marker Glow */}
            <filter id="emerald-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Sky Crosshair Glow */}
            <filter id="sky-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Coordinate Latitude Grid Parallels */}
          <g className="stroke-slate-300 dark:stroke-[#1a2233]" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.6">
            <line x1="0" y1="100" x2="1000" y2="100" />
            <line x1="0" y1="160" x2="1000" y2="160" />
            <line x1="0" y1="220" x2="1000" y2="220" strokeWidth="0.8" />
            <line x1="0" y1="280" x2="1000" y2="280" />
            <line x1="0" y1="340" x2="1000" y2="340" />
          </g>

          {/* Coordinate Longitude Grid Meridians */}
          <g className="stroke-slate-300 dark:stroke-[#1a2233]" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.6">
            <line x1="250" y1="42" x2="250" y2="398" />
            <line x1="500" y1="42" x2="500" y2="398" strokeWidth="0.8" />
            <line x1="750" y1="42" x2="750" y2="398" />
          </g>

          {/* High-Contrast Landmass Polygons */}
          <path
            d={map.land}
            className="fill-slate-200/90 stroke-slate-300/80 transition-colors dark:fill-[#101522] dark:stroke-[#243149]"
            strokeWidth={0.85}
          />

          {/* Located Egress Pins & Callout Badges */}
          {located.map((g) => {
            const isHovered = hoveredIso === g.iso;
            const live = g.online > 0;
            const markerColor = live ? "#10b981" : "#64748b";
            const targetX = g.x + g.labelDx;
            const targetY = g.y + g.labelDy;

            return (
              <g
                key={g.iso}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIso(g.iso)}
                onMouseLeave={() => setHoveredIso(null)}
              >
                {/* Leader Line if label is offset */}
                {(g.labelDx !== 0 || g.labelDy !== -20) && (
                  <line
                    x1={g.x}
                    y1={g.y}
                    x2={targetX}
                    y2={targetY + 8}
                    stroke={isHovered ? "#38bdf8" : "#10b981"}
                    strokeWidth="1"
                    strokeOpacity={isHovered ? 0.9 : 0.4}
                    strokeDasharray="2 2"
                  />
                )}

                {/* Radar Scanning Ring for Active Nodes */}
                {live && (
                  <circle
                    cx={g.x}
                    cy={g.y}
                    r={isHovered ? 14 : 10}
                    fill="none"
                    stroke={isHovered ? "#38bdf8" : markerColor}
                    strokeWidth="1"
                    strokeOpacity="0.45"
                    className="animate-ping"
                    style={{ animationDuration: "3s" }}
                  />
                )}

                {/* Outer Target Ring */}
                <circle
                  cx={g.x}
                  cy={g.y}
                  r={isHovered ? 8 : 6}
                  fill="none"
                  stroke={isHovered ? "#38bdf8" : markerColor}
                  strokeWidth="1.5"
                  strokeOpacity={isHovered ? 1 : 0.75}
                  filter={isHovered ? "url(#sky-glow)" : "url(#emerald-glow)"}
                />

                {/* Center Core Pin */}
                <circle
                  cx={g.x}
                  cy={g.y}
                  r="3.5"
                  fill={isHovered ? "#38bdf8" : markerColor}
                />
                <circle cx={g.x} cy={g.y} r="1.5" fill="#ffffff" />

                {/* Precision Floating Callout Badge */}
                <g transform={`translate(${targetX - 22}, ${targetY - 8})`}>
                  <rect
                    width="44"
                    height="18"
                    rx="5"
                    strokeWidth={isHovered ? 1.5 : 1}
                    className={cn(
                      "transition-all shadow-sm",
                      isHovered
                        ? "fill-sky-50 stroke-sky-500 dark:fill-[#0c121e] dark:stroke-sky-400"
                        : live
                          ? "fill-white stroke-emerald-500/50 dark:fill-[#0a0d14] dark:stroke-[#1f3a2d]"
                          : "fill-white stroke-slate-300 dark:fill-[#0a0d14] dark:stroke-[#242d3d]"
                    )}
                  />
                  <text
                    x="22"
                    y="10"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      "font-mono text-[9px] font-bold uppercase tracking-wider",
                      isHovered ? "fill-sky-700 dark:fill-sky-300" : live ? "fill-emerald-700 dark:fill-emerald-400" : "fill-slate-600 dark:fill-zinc-400"
                    )}
                  >
                    {g.iso.toUpperCase()} {g.count}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Interactive Floating Hover HUD (shows details when hovering on marker) */}
        {activeGroup && (
          <div
            className="pointer-events-none absolute z-30 flex flex-col gap-1.5 rounded-xl border border-sky-500/40 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-md transition-all font-mono dark:bg-[#090d15]/95 dark:text-zinc-100 p-3.5"
            style={{
              left: `${Math.min(Math.max((activeGroup.x / 1000) * 100, 15), 75)}%`,
              top: `${Math.min(Math.max(((activeGroup.y - 42) / 356) * 100, 20), 70)}%`,
              transform: "translate(-50%, -115%)",
              width: "280px",
            }}
          >
            {/* HUD Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-[#1f2638]">
              <div className="flex items-center gap-2">
                <span className="rounded bg-sky-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-sky-700 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-400 dark:border-sky-700/50">
                  {activeGroup.iso.toUpperCase()}
                </span>
                <span className="font-bold text-slate-900 text-xs dark:text-zinc-100">{activeGroup.country}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold dark:text-emerald-400">
                {activeGroup.online}/{activeGroup.count} ACTIVE
              </span>
            </div>

            {/* Tunnel Nodes List */}
            <div className="space-y-1 py-1 text-2xs">
              {activeGroup.workers.slice(0, 4).map((w) => (
                <div key={w.name} className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    <span className="font-bold text-slate-900 dark:text-white">{w.name}</span>
                  </span>
                  <span className="text-slate-400 dark:text-zinc-500">
                    {w.proxy?.port ? `:${w.proxy.port}` : "Wire"}
                  </span>
                </div>
              ))}
              {activeGroup.workers.length > 4 && (
                <div className="text-3xs text-slate-400 dark:text-zinc-500">
                  +{activeGroup.workers.length - 4} more exit nodes
                </div>
              )}
            </div>

            {/* Bottom HUD Stats */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-[10px] text-slate-500 dark:border-[#1f2638] dark:text-zinc-400">
              <span>Transferred: <strong className="text-slate-800 dark:text-zinc-200">{fmtBytes(activeGroup.totalBytes)}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400">Zero Leaks</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Active Egress
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-300 dark:bg-zinc-600" /> Offline / Standby
          </span>
        </div>
        <span className="font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
          {located.length} {located.length === 1 ? "GEOGRAPHIC REGION" : "GEOGRAPHIC REGIONS"} ACTIVE
        </span>
      </div>
    </div>
  );
}
