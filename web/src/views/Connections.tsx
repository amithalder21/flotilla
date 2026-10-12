import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info, Power, RotateCw, ScrollText, Search, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { keys, toast, useWorkers } from "@/lib/hooks";
import type { Worker } from "@/lib/types";
import { CountryChip, Mono, StatusPill } from "@/components/common";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ConnectionDrawer } from "./ConnectionDrawer";
import { LogsDrawer } from "./LogsDrawer";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "attention", label: "Needs attention" },
  { id: "stopped", label: "Stopped" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function running(w: Worker) {
  return w.exists && w.vpn === "running";
}

export function Connections() {
  const qc = useQueryClient();
  const { data: workers = [] } = useWorkers();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: keys.workers });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return workers.filter((w) => {
      if (filter === "connected" && !(running(w) && w.health === "healthy")) return false;
      if (filter === "attention" && !(w.gaveup || (running(w) && w.health === "unhealthy"))) return false;
      if (filter === "stopped" && running(w)) return false;
      if (!term) return true;
      const hay = [w.name, w.ipinfo?.ip, w.ipinfo?.country, w.ipinfo?.org, ...(w.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [workers, q, filter]);

  async function act(name: string, action: string, note?: string) {
    setBusy((b) => new Set(b).add(name));
    if (note) toast(`${name}: ${note}`, "info", 1400);
    try {
      await api("POST", `/api/workers/${name}/${action}`);
    } catch (e: any) {
      toast(`${name}: ${e.message}`, "err");
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(name);
        return n;
      });
      refresh();
    }
  }

  async function bulk(action: string, verb: string) {
    const targets = selected.size ? [...selected] : undefined;
    try {
      const r = await api<Record<string, any>>("POST", `/api/bulk/${action}`, targets ? { targets } : {});
      const errs = Object.entries(r).filter(([, v]) => v && v.error);
      errs.length
        ? toast(errs.map(([k, v]) => `${k}: ${v.error}`).join("\n"), "err")
        : toast(`${verb} ${Object.keys(r).length} connection(s)`, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  async function upload(files: FileList) {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    try {
      const r = await api<{ saved: string[] }>("POST", "/api/profiles", fd, true);
      toast(`Added ${r.saved.join(", ")}`, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  function toggleSel(name: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }
  const allSel = rows.length > 0 && rows.every((w) => selected.has(w.name));

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Fleet Connections</CardTitle>
            <span className="rounded-full border border-[#262e40] bg-[#121622] px-2.5 py-0.5 font-mono text-[11px] font-bold text-zinc-300 tabular-nums">
              {workers.length} {workers.length === 1 ? "EXIT" : "EXITS"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => bulk("stop", "Disconnected")}>
              Disconnect all
            </Button>
            <Button variant="primary" size="sm" onClick={() => bulk("start", "Connected")}>
              Connect all
            </Button>
          </div>
        </CardHeader>

        {/* Filters & Search Deck */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1d2230] bg-[#090c12] px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, IP, country, org or tag…"
              className="h-8 pl-8 text-xs font-mono"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-lg border px-3 py-1 font-semibold uppercase tracking-wider transition-colors",
                  filter === f.id
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                    : "border-[#202737] bg-[#121622] text-zinc-400 hover:border-[#2f3950] hover:text-zinc-200",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#1d2230] bg-emerald-950/20 px-5 py-2.5 font-mono text-xs text-emerald-300">
            <span className="font-bold tracking-wider uppercase">{selected.size} SELECTED</span>
            <div className="flex-1" />
            <Button size="xs" variant="primary" onClick={() => bulk("start", "Connected")}>Connect</Button>
            <Button size="xs" variant="secondary" onClick={() => bulk("stop", "Disconnected")}>Disconnect</Button>
            <Button size="xs" variant="secondary" onClick={() => bulk("restart", "Reconnected")}>Reconnect</Button>
            <Button size="xs" variant="danger" onClick={() => bulk("shutdown", "Shut down")}>Shut down</Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {/* Connections Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#1d2230] text-left font-mono text-2xs uppercase tracking-wider text-zinc-400">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="size-3.5 cursor-pointer accent-emerald-500 rounded bg-[#161a24] border-[#2b3548]"
                    checked={allSel}
                    onChange={() =>
                      setSelected(allSel ? new Set() : new Set(rows.map((w) => w.name)))
                    }
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Connection</th>
                <th className="px-3 py-3 font-semibold">Exit Region</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Local Proxy</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-mono text-xs text-zinc-500">
                    {workers.length ? "No connections match the current filter." : "No connections yet — drop .ovpn profiles below to add one."}
                  </td>
                </tr>
              )}
              {rows.map((w) => {
                const on = running(w);
                const isBusy = busy.has(w.name);
                return (
                  <tr
                    key={w.name}
                    className="group border-b border-[#181d28] transition-colors last:border-0 hover:bg-[#121622]/80"
                  >
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        className="size-3.5 cursor-pointer accent-emerald-500 rounded bg-[#161a24] border-[#2b3548]"
                        checked={selected.has(w.name)}
                        onChange={() => toggleSel(w.name)}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <button className="text-left" onClick={() => setDetail(w.name)}>
                        <div className="font-mono text-[13px] font-bold text-zinc-200 group-hover:text-white transition-colors">
                          {w.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          {w.tags?.map((t) => (
                            <span key={t} className="rounded border border-sky-500/30 bg-sky-950/40 px-1.5 py-0.5 font-semibold uppercase text-sky-400">
                              {t}
                            </span>
                          ))}
                          {w.ipinfo?.org && !w.tags?.length && (
                            <span className="truncate text-zinc-500 max-w-[200px]">{w.ipinfo.org}</span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <CountryChip iso={w.ipinfo?.country_iso} country={w.ipinfo?.country} />
                        {w.ipinfo?.ip && <span className="font-mono text-[11px] text-zinc-500">{w.ipinfo.ip}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <StatusPill w={w} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {w.proxy?.online ? (
                        <span className="font-mono text-xs text-zinc-300">127.0.0.1:{w.proxy.port}</span>
                      ) : (
                        <span className="font-mono text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <Hint label={on ? "Disconnect" : "Connect"}>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={isBusy}
                            className={on ? "text-emerald-400 hover:bg-rose-950/40 hover:text-rose-400" : "text-zinc-400 hover:text-white"}
                            onClick={() => act(w.name, on ? "stop" : "start", on ? "disconnecting…" : "connecting…")}
                          >
                            <Power className="size-3.5" />
                          </Button>
                        </Hint>
                        <Hint label="Live logs">
                          <Button size="icon-sm" variant="ghost" onClick={() => setLogsFor(w.name)} className="text-zinc-400 hover:text-white">
                            <ScrollText className="size-3.5" />
                          </Button>
                        </Hint>
                        <Hint label="Reconnect">
                          <Button size="icon-sm" variant="ghost" disabled={isBusy} onClick={() => act(w.name, "restart", "reconnecting…")} className="text-zinc-400 hover:text-white">
                            <RotateCw className="size-3.5" />
                          </Button>
                        </Hint>
                        <Hint label="Details">
                          <Button size="icon-sm" variant="ghost" onClick={() => setDetail(w.name)} className="text-zinc-400 hover:text-white">
                            <Info className="size-3.5" />
                          </Button>
                        </Hint>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardBody>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed py-6 px-4 text-xs font-mono transition-all",
              drag
                ? "border-emerald-500 bg-emerald-950/20 text-emerald-300"
                : "border-[#252f44] bg-[#0a0d13] text-zinc-400 hover:border-emerald-500/50 hover:bg-[#0e121a] hover:text-zinc-200",
            )}
          >
            <Upload className="size-4 text-emerald-400" />
            <span>
              Drop <strong className="text-zinc-200">.ovpn</strong> profiles here or click to browse — each becomes an isolated tunnel exit in the fleet.
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".ovpn,.conf"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </CardBody>
      </Card>

      <ConnectionDrawer name={detail} onClose={() => setDetail(null)} onLogs={(n) => { setDetail(null); setLogsFor(n); }} />
      <LogsDrawer name={logsFor} onClose={() => setLogsFor(null)} />
    </div>
  );
}
