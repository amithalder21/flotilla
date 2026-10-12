import { useEffect, useMemo, useState } from "react";
import type { Worker } from "@/lib/types";
import { EmptyState } from "./common";

interface MapData {
  w: number;
  h: number;
  land: string;
  cents: Record<string, [number, number]>;
}

let cache: MapData | null = null;

export function WorldMap({ workers }: { workers: Worker[] }) {
  const [map, setMap] = useState<MapData | null>(cache);
  const [failed, setFailed] = useState(false);

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

  const groups = useMemo(() => {
    const g: Record<string, { iso: string; country: string; count: number; online: number }> = {};
    for (const w of workers) {
      const iso = w.ipinfo?.country_iso?.toLowerCase();
      if (!iso) continue;
      if (!g[iso]) g[iso] = { iso, country: w.ipinfo?.country || iso.toUpperCase(), count: 0, online: 0 };
      g[iso].count++;
      if (w.exists && w.vpn === "running" && w.health === "healthy") g[iso].online++;
    }
    return g;
  }, [workers]);

  if (failed) return <EmptyState>Map unavailable.</EmptyState>;
  if (!map) return <EmptyState>Loading map…</EmptyState>;

  const located = Object.values(groups).filter((g) => map.cents[g.iso]);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 42 ${map.w} 356`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-[300px] w-full"
        role="img"
        aria-label="World map of exit locations"
      >
        <path d={map.land} fill="#141926" stroke="#263147" strokeWidth={0.75} />
        {located.map((g) => {
          const [x, y] = map.cents[g.iso];
          const live = g.online > 0;
          const color = live ? "#10b981" : "#4b5563";
          const r = Math.min(5 + g.count * 2.2, 13);
          return (
            <g key={g.iso}>
              {live && (
                <circle
                  cx={x}
                  cy={y}
                  r={r + 8}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                  className="animate-ping"
                  style={{ animationDuration: "3s" }}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={color}
                style={live ? { filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" } : undefined}
              />
              {g.count > 1 && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-mono font-bold text-[10px]"
                >
                  {g.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#1d2230] pt-3 text-xs font-mono text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Active egress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-zinc-600" /> Offline
        </span>
        <span className="ml-auto tabular-nums text-zinc-300">
          {located.length ? `${located.length} ${located.length === 1 ? "REGION" : "REGIONS"} LOCATED` : "No located exits"}
        </span>
      </div>
    </div>
  );
}
