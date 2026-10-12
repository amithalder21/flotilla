import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys, toast, useWorkers } from "@/lib/hooks";
import type { Worker } from "@/lib/types";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SectionLabel, statusOf } from "@/components/common";
import { fmtBytes, fmtRate, fmtUptime } from "@/lib/format";
import { cn } from "@/lib/utils";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-2xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-zinc-200">{children}</div>
    </div>
  );
}

export function ConnectionDrawer({
  name,
  onClose,
  onLogs,
}: {
  name: string | null;
  onClose: () => void;
  onLogs: (n: string) => void;
}) {
  const qc = useQueryClient();
  const { data: workers = [] } = useWorkers(!!name);
  const w = workers.find((x) => x.name === name) as Worker | undefined;
  const [confirmDel, setConfirmDel] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: keys.workers });

  async function act(action: string, note?: string) {
    if (note && name) toast(`${name}: ${note}`, "info", 1400);
    try {
      await api("POST", `/api/workers/${name}/${action}`);
    } catch (e: any) {
      toast(`${name}: ${e.message}`, "err");
    }
    refresh();
  }

  async function del() {
    try {
      await api("DELETE", `/api/profiles/${name}`);
      toast(`${name} deleted`, "ok");
      onClose();
    } catch (e: any) {
      toast(`${name}: ${e.message}`, "err");
    }
    refresh();
  }

  async function rename() {
    const to = prompt("Rename connection to:", name || "");
    if (!to || to === name) return;
    try {
      await api("POST", `/api/profiles/${name}/rename`, { to });
      toast(`Renamed to ${to}`, "ok");
      onClose();
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  const on = !!w && w.exists && w.vpn === "running";
  const s = w ? statusOf(w) : null;
  const banner = {
    ok: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    warn: "border-amber-500/40 bg-amber-950/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    bad: "border-rose-500/40 bg-rose-950/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    muted: "border-[#202737] bg-[#121622] text-zinc-400",
  };

  return (
    <Sheet open={!!name} onOpenChange={(o) => !o && onClose()} title={name || ""} width="560px">
      {w && s && (
        <div className="flex-1 space-y-5 overflow-auto p-5 font-mono">
          <div className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider", banner[s.tone])}>
            <span className="size-2 rounded-full bg-current" />
            {s.label}
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-xl border border-[#1f2638] bg-[#0c1018] p-4.5">
            <Fact label="Exit IP">{w.ipinfo?.ip || "—"}</Fact>
            <Fact label="Location">{w.ipinfo?.country ? `${w.ipinfo.country_iso || ""} ${w.ipinfo.country}` : "—"}</Fact>
            <Fact label="Tunnel Uptime">{on ? fmtUptime(w.started_at) : "—"}</Fact>
            <Fact label="Data Transferred">
              {w.stats ? `${fmtBytes((w.stats.rx_mb || 0) * 1e6)} in · ${fmtBytes((w.stats.tx_mb || 0) * 1e6)} out` : "—"}
            </Fact>
            <Fact label="ISP / ASN">{w.ipinfo?.org || "—"}</Fact>
            <Fact label="Local Proxy">{w.proxy?.online ? `127.0.0.1:${w.proxy.port}` : "offline"}</Fact>
            <Fact label="Restarts">{w.restarts ?? 0}</Fact>
            <Fact label="Tags">{w.tags?.length ? w.tags.join(", ") : "none"}</Fact>
          </div>

          <div>
            <SectionLabel>Tunnel Operations</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant={on ? "secondary" : "primary"} onClick={() => act(on ? "stop" : "start", on ? "disconnecting…" : "connecting…")}>
                {on ? "Disconnect" : "Connect"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act("restart", "reconnecting…")}>Reconnect</Button>
              <Button size="sm" variant="secondary" onClick={() => act("shutdown", "shutting down…")}>Shut down</Button>
              <Button size="sm" variant="secondary" onClick={() => name && onLogs(name)}>Live logs</Button>
            </div>
          </div>

          <div>
            <SectionLabel>Integrity & Leak Tests</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => act("ip", "checking exit IP…")}>Verify Exit IP</Button>
              <Button size="sm" variant="secondary" onClick={() => act("leaktest", "running leak test…")}>Run Leak Test</Button>
            </div>
            {w.leak && (
              <p className={cn("mt-2 text-xs", w.leak.pass ? "text-emerald-400" : "text-rose-400")}>
                {w.leak.pass ? `Isolated tunnel verified — exit ${w.leak.exit_ip}` : `Leak alert: ${w.leak.reason}`}
              </p>
            )}
          </div>

          <div>
            <SectionLabel>Profile Configuration</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={rename}>Rename Profile…</Button>
              {confirmDel ? (
                <Button size="sm" variant="danger" onClick={del}>
                  Confirm Delete Profile
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-rose-400 hover:bg-rose-950/40" onClick={() => { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 4000); }}>
                  Delete Connection
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
