import React, { useMemo, useState, useEffect } from "react";
import { Layers, ShieldCheck, Activity } from "lucide-react";
import type { Worker } from "@/lib/types";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EXIT_PALETTE } from "./FleetHero";

export interface ActivityStripProps {
  workers: Worker[];
  nowRate?: { rx: number; tx: number };
  onSelectExit?: (workerName: string) => void;
}

export function ActivityStrip({ workers, nowRate, onSelectExit }: ActivityStripProps) {
  // Active exits
  const connected = useMemo(() => {
    return workers.filter((w) => w.exists && w.vpn === "running" && w.health === "healthy");
  }, [workers]);

  const activeWorkers = connected.length ? connected : workers.filter((w) => w.exists && w.vpn === "running");

  // Total cumulative data transferred across active workers
  const totalBytes = useMemo(() => {
    return activeWorkers.reduce(
      (sum, w) => sum + ((w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0)) * 1e6,
      0
    );
  }, [activeWorkers]);

  const totalRateBytes = (nowRate?.rx || 0) + (nowRate?.tx || 0);

  // Format speed split
  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return "0.0 KB/s";
    const mb = bytesPerSec / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
    const kb = bytesPerSec / 1024;
    return `${kb.toFixed(1)} KB/s`;
  };

  // Generate 56 blocks (2 rows × 28) representing Plexo's segmented chunk blocks
  // Live pulse tick to simulate active chunks streaming through
  const [pulseTick, setPulseTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((t) => (t + 1) % 56);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const totalBlocks = 56; // 2 rows * 28 cols

  const blocks = useMemo(() => {
    if (!activeWorkers.length) {
      return Array.from({ length: totalBlocks }, () => ({
        type: "empty" as const,
        colorIndex: -1,
        workerName: "",
      }));
    }

    // Allocate blocks according to each worker's data share
    const shares = activeWorkers.map((w, idx) => {
      const bytes = ((w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0)) * 1e6;
      return {
        worker: w,
        idx,
        share: totalBytes > 0 ? bytes / totalBytes : 1 / activeWorkers.length,
      };
    });

    const out: { type: "solid" | "outline" | "empty"; colorIndex: number; workerName: string }[] = [];
    
    // Fill up to ~65% of blocks as active chunks, remainder as queue/empty
    const activeChunkCount = Math.min(Math.floor(totalBlocks * 0.65), 38);
    let currentWorkerIdx = 0;
    let workerBudget = Math.max(1, Math.round(activeChunkCount * shares[0]?.share || 1));

    for (let i = 0; i < totalBlocks; i++) {
      if (i < activeChunkCount) {
        const wShare = shares[currentWorkerIdx];
        const isSolid = (i + pulseTick) % 3 !== 0; // Mix of solid glowing blocks and outlined blocks
        out.push({
          type: isSolid ? "solid" : "outline",
          colorIndex: wShare.idx,
          workerName: wShare.worker.name,
        });

        workerBudget--;
        if (workerBudget <= 0 && currentWorkerIdx < shares.length - 1) {
          currentWorkerIdx++;
          workerBudget = Math.max(1, Math.round(activeChunkCount * shares[currentWorkerIdx]?.share || 1));
        }
      } else {
        out.push({
          type: "empty",
          colorIndex: -1,
          workerName: "",
        });
      }
    }

    return out;
  }, [activeWorkers, totalBytes, pulseTick]);

  return (
    <div className="flex flex-col rounded-2xl border border-[#232838] bg-[#0d1017] p-5 text-white shadow-xl">
      {/* Top Section Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1f2433]">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
            Per-Exit Activity Matrix
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">· 56 Chunk Slots</span>
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {activeWorkers.slice(0, 5).map((w, i) => {
            const pal = EXIT_PALETTE[i % EXIT_PALETTE.length];
            return (
              <span key={w.name} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: pal.hex }} />
                <span className="text-zinc-300 font-medium">{w.name}</span>
                {w.ipinfo?.country_iso && (
                  <span className="text-[10px] text-zinc-500">[{w.ipinfo.country_iso}]</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* The Plexo Segmented-Block Matrix (2 rows x 28 columns) */}
      <div className="py-4">
        <div className="grid grid-cols-14 sm:grid-cols-28 gap-1.5">
          {blocks.map((block, i) => {
            const pal = block.colorIndex >= 0 ? EXIT_PALETTE[block.colorIndex % EXIT_PALETTE.length] : null;

            if (block.type === "solid" && pal) {
              return (
                <div
                  key={i}
                  title={`${block.workerName} · active slice #${i + 1}`}
                  className="h-3.5 w-full rounded-[3px] transition-all duration-300 hover:scale-110"
                  style={{
                    backgroundColor: pal.hex,
                    boxShadow: `0 0 8px ${pal.hex}88`,
                  }}
                />
              );
            }

            if (block.type === "outline" && pal) {
              return (
                <div
                  key={i}
                  title={`${block.workerName} · verified slice #${i + 1}`}
                  className="h-3.5 w-full rounded-[3px] transition-all duration-300 hover:scale-110"
                  style={{
                    border: `1.5px solid ${pal.hex}bb`,
                    backgroundColor: `${pal.hex}22`,
                  }}
                />
              );
            }

            // Empty queue block
            return (
              <div
                key={i}
                title="Buffer queue slot"
                className="h-3.5 w-full rounded-[3px] border border-[#212635] bg-[#141822] opacity-60"
              />
            );
          })}
        </div>
      </div>

      {/* Per-Exit Breakdown Table (Plexo Networks Table equivalent) */}
      <div className="mt-2 flex flex-col border-t border-[#1f2433] pt-3">
        <div className="mb-2 flex items-center justify-between text-2xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
          <span>EXIT ENDPOINTS</span>
          <span>
            {activeWorkers.length} Merged · {activeWorkers.length * 4} Streams · {activeWorkers.length} Active
          </span>
        </div>

        <div className="space-y-2.5">
          {activeWorkers.map((w, i) => {
            const pal = EXIT_PALETTE[i % EXIT_PALETTE.length];
            const workerBytes = ((w.stats?.rx_mb || 0) + (w.stats?.tx_mb || 0)) * 1e6;
            const sharePercent = totalBytes > 0 ? Math.round((workerBytes / totalBytes) * 100) : Math.round(100 / activeWorkers.length);
            const estSpeed = totalRateBytes > 0 ? totalRateBytes * (sharePercent / 100) : 0;

            return (
              <div
                key={w.name}
                onClick={() => onSelectExit?.(w.name)}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1b212f] bg-[#10141d] px-3.5 py-2.5 transition-colors hover:border-[#2b344a] hover:bg-[#141924]"
              >
                {/* Left: Exit Dot & Info */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: pal.hex,
                      boxShadow: `0 0 6px ${pal.hex}88`,
                    }}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-200 group-hover:text-white">
                        {w.name}
                      </span>
                      {w.ipinfo?.country_iso && (
                        <span className="rounded bg-[#1a202c] px-1 py-0.2 font-mono text-[9.5px] font-bold uppercase text-zinc-400">
                          [{w.ipinfo.country_iso}]
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {w.proxy?.port ? `Proxy :${w.proxy.port}` : "Direct Wire"} · 4 streams
                    </span>
                  </div>
                </div>

                {/* Center: Share Progress Bar */}
                <div className="flex flex-1 items-center gap-3 min-w-[140px] max-w-sm">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1b212e]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(sharePercent, 4)}%`,
                        backgroundColor: pal.hex,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-xs font-semibold text-zinc-400 tabular-nums">
                    {sharePercent}%
                  </span>
                </div>

                {/* Right: Speed & Downloaded */}
                <div className="flex items-center gap-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className={cn("font-mono text-xs font-bold tabular-nums", pal.text)}>
                      {formatSpeed(estSpeed)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Speed</span>
                  </div>

                  <div className="flex flex-col items-end min-w-[75px]">
                    <span className="font-mono text-xs font-medium text-zinc-300 tabular-nums">
                      {fmtBytes(workerBytes)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Moved</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
