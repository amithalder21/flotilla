import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  Globe,
  MapPin,
  Network,
  Plus,
  Power,
  PowerOff,
  RotateCw,
  ScrollText,
  Server,
  Shield,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { keys, toast, useWorkers } from "@/lib/hooks";
import type { Worker } from "@/lib/types";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CountryChip, SectionLabel, StatusPill, statusOf } from "@/components/common";
import { fmtBytes, fmtUptime } from "@/lib/format";
import { cn } from "@/lib/utils";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast(`Copied ${label} to clipboard`, "ok", 1500);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-[#1a2130] dark:hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  children,
  action,
  className,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all",
        "hover:border-slate-300 dark:border-[#1e2536] dark:bg-[#0c1017] dark:hover:border-[#2a344c]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-slate-400 dark:text-zinc-500" />
          <span className="font-mono text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
            {label}
          </span>
        </div>
        {action}
      </div>
      <div className="mt-2 font-mono text-[13px] font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
        {children}
      </div>
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
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: keys.workers });

  async function act(action: string, note?: string) {
    setBusyAction(action);
    if (note && name) toast(`${name}: ${note}`, "info", 1400);
    try {
      await api("POST", `/api/workers/${name}/${action}`);
    } catch (e: any) {
      toast(`${name}: ${e.message}`, "err");
    } finally {
      setBusyAction(null);
      refresh();
    }
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

  async function addTag() {
    if (!name || !w) return;
    const tag = prompt("Enter tag name (e.g. fast, residential, streaming):")?.trim().toLowerCase();
    if (!tag) return;
    const existing = w.tags || [];
    if (existing.includes(tag)) {
      toast("Tag already exists", "info");
      return;
    }
    const updated = [...existing, tag];
    try {
      await api("POST", `/api/profiles/${name}/tags`, { tags: updated });
      toast(`Added tag "${tag}"`, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  async function removeTag(tagToRemove: string) {
    if (!name || !w) return;
    const existing = w.tags || [];
    const updated = existing.filter((t) => t !== tagToRemove);
    try {
      await api("POST", `/api/profiles/${name}/tags`, { tags: updated });
      toast(`Removed tag "${tagToRemove}"`, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  const on = !!w && w.exists && w.vpn === "running";
  const s = w ? statusOf(w) : null;

  return (
    <Sheet
      open={!!name}
      onOpenChange={(o) => !o && onClose()}
      title={
        <div className="flex items-center gap-2">
          <span>{name || ""}</span>
          {w?.ipinfo?.country_iso && (
            <CountryChip iso={w.ipinfo.country_iso} country={w.ipinfo.country} />
          )}
        </div>
      }
      meta={w ? <StatusPill w={w} /> : undefined}
      width="580px"
    >
      {w && s && (
        <div className="flex-1 space-y-5 overflow-auto p-5 font-mono">
          {/* Tunnel Status Hero Card */}
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-all",
              s.tone === "ok" &&
                "border-emerald-500/30 bg-emerald-500/[0.04] dark:border-emerald-500/30 dark:bg-emerald-950/20",
              s.tone === "warn" &&
                "border-amber-500/30 bg-amber-500/[0.04] dark:border-amber-500/30 dark:bg-amber-950/20",
              s.tone === "bad" &&
                "border-rose-500/30 bg-rose-500/[0.04] dark:border-rose-500/30 dark:bg-rose-950/20",
              s.tone === "muted" &&
                "border-slate-200 bg-slate-50/70 dark:border-[#202737] dark:bg-[#10141e]",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border",
                    s.tone === "ok" &&
                      "border-emerald-500/40 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
                    s.tone === "warn" &&
                      "border-amber-500/40 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
                    s.tone === "bad" &&
                      "border-rose-500/40 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
                    s.tone === "muted" &&
                      "border-slate-200 bg-slate-100 text-slate-500 dark:border-[#2a3449] dark:bg-[#161c28] dark:text-zinc-400",
                  )}
                >
                  <Activity className={cn("size-4.5", on && "animate-pulse")} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                      {s.label.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        s.tone === "ok" && "bg-emerald-500 animate-ping",
                        s.tone === "warn" && "bg-amber-500",
                        s.tone === "bad" && "bg-rose-500",
                        s.tone === "muted" && "bg-slate-400 dark:bg-zinc-600",
                      )}
                    />
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                    {on
                      ? `gluetun · ${w.health === "healthy" ? "Encrypted tunnel healthy" : "Health check pending"}`
                      : "Container exited · Tunnel inactive"}
                  </div>
                </div>
              </div>

              {/* Uptime and Resource Pills */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {on && w.started_at && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 shadow-2xs dark:border-[#222a3c] dark:bg-[#121622] dark:text-zinc-300">
                    <Clock className="size-3 text-slate-400 dark:text-zinc-500" />
                    {fmtUptime(w.started_at)}
                  </span>
                )}
                {w.stats && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 shadow-2xs dark:border-[#222a3c] dark:bg-[#121622] dark:text-zinc-300">
                    {(w.stats.cpu ?? 0).toFixed(1)}% CPU
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry & Network Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={Globe}
              label="Exit IP"
              action={w.ipinfo?.ip ? <CopyButton text={w.ipinfo.ip} label="Exit IP" /> : undefined}
            >
              <div className="text-[13px]">{w.ipinfo?.ip || "—"}</div>
            </MetricCard>

            <MetricCard icon={MapPin} label="Location">
              <div className="flex flex-col gap-0.5">
                <CountryChip iso={w.ipinfo?.country_iso} country={w.ipinfo?.country} />
                {w.ipinfo?.city && (
                  <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400">
                    {w.ipinfo.city}
                    {w.ipinfo.region ? `, ${w.ipinfo.region}` : ""}
                  </span>
                )}
              </div>
            </MetricCard>

            <MetricCard
              icon={Server}
              label="Local HTTP Proxy"
              action={
                w.proxy?.online ? (
                  <CopyButton text={`http://127.0.0.1:${w.proxy.port}`} label="Proxy URL" />
                ) : undefined
              }
            >
              {w.proxy?.online ? (
                <div className="flex items-center gap-2">
                  <span>127.0.0.1:{w.proxy.port}</span>
                  <span className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    ACTIVE
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 dark:text-zinc-600">offline</span>
              )}
            </MetricCard>

            <MetricCard icon={Network} label="ISP / ASN">
              <span className="truncate block max-w-[200px]" title={w.ipinfo?.org || undefined}>
                {w.ipinfo?.org || "—"}
              </span>
            </MetricCard>

            <MetricCard icon={Activity} label="Data Transferred">
              {w.stats ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                    <ArrowDown className="size-3" /> {fmtBytes((w.stats.rx_mb || 0) * 1e6)}
                  </span>
                  <span className="text-slate-300 dark:text-zinc-600">·</span>
                  <span className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400">
                    <ArrowUp className="size-3" /> {fmtBytes((w.stats.tx_mb || 0) * 1e6)}
                  </span>
                </div>
              ) : (
                "—"
              )}
            </MetricCard>

            <MetricCard icon={RotateCw} label="Watchdog Restarts">
              <div className="flex items-center gap-2">
                <span>{w.restarts ?? 0}</span>
                {w.gaveup && (
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                    GAVE UP
                  </span>
                )}
              </div>
            </MetricCard>

            {/* Fleet Tags Card spanning full width */}
            <MetricCard
              icon={Tag}
              label="Fleet Tags"
              className="col-span-2"
              action={
                <button
                  type="button"
                  onClick={addTag}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-2xs dark:border-[#232b3e] dark:bg-[#121622] dark:text-zinc-400 dark:hover:border-[#2f3a53] dark:hover:text-zinc-200 transition-colors"
                >
                  <Plus className="size-3" /> Add Tag
                </button>
              }
            >
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {w.tags && w.tags.length > 0 ? (
                  w.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        title={`Remove tag ${t}`}
                        className="opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] font-normal text-slate-400 dark:text-zinc-500">
                    No tags assigned to this connection
                  </span>
                )}
              </div>
            </MetricCard>
          </div>

          {/* Operations Toolbar */}
          <div className="space-y-2">
            <SectionLabel>Tunnel Operations</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={on ? "secondary" : "primary"}
                disabled={busyAction === "stop" || busyAction === "start"}
                onClick={() => act(on ? "stop" : "start", on ? "disconnecting…" : "connecting…")}
                className={cn(
                  "font-mono text-xs",
                  on &&
                    "hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-900/60 dark:hover:text-rose-400",
                )}
              >
                <Power className="size-3.5" />
                {on ? "Disconnect" : "Connect"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyAction === "restart"}
                onClick={() => act("restart", "reconnecting…")}
                className="font-mono text-xs"
              >
                <RotateCw className={cn("size-3.5", busyAction === "restart" && "animate-spin")} />
                Reconnect
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyAction === "shutdown"}
                onClick={() => act("shutdown", "shutting down…")}
                className="font-mono text-xs"
              >
                <PowerOff className="size-3.5 text-amber-500" />
                Shut down
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => name && onLogs(name)}
                className="font-mono text-xs"
              >
                <ScrollText className="size-3.5 text-sky-500" />
                Live logs
              </Button>
            </div>
          </div>

          {/* Integrity & Leak Tests */}
          <div className="space-y-2">
            <SectionLabel>Integrity & Leak Tests</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busyAction === "ip"}
                onClick={() => act("ip", "probing exit IP…")}
                className="font-mono text-xs"
              >
                <Globe className={cn("size-3.5", busyAction === "ip" && "animate-spin text-emerald-500")} />
                Verify Exit IP
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyAction === "leaktest"}
                onClick={() => act("leaktest", "running leak test…")}
                className="font-mono text-xs"
              >
                <ShieldCheck
                  className={cn("size-3.5 text-emerald-500", busyAction === "leaktest" && "animate-pulse")}
                />
                Run Leak Test
              </Button>
            </div>

            {w.leak && (
              <div
                className={cn(
                  "mt-3 flex items-start gap-3 rounded-xl border p-3.5 font-mono text-xs transition-all",
                  w.leak.pass
                    ? "border-emerald-500/30 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-50/80 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300",
                )}
              >
                {w.leak.pass ? (
                  <ShieldCheck className="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-4.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold">
                    {w.leak.pass ? "Isolated Tunnel Verified" : "Leak Alert Detected"}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                    {w.leak.pass
                      ? `Traffic exits through ${w.leak.exit_ip} (${w.leak.country || w.leak.country_iso || "isolated"}). Controller host public IP (${w.leak.host_ip || "host"}) is not exposed.`
                      : `Alert: ${w.leak.reason}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Configuration & Danger Zone */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-[#1d2334] dark:bg-[#0a0d14]">
            <SectionLabel className="mb-2.5">Profile Configuration</SectionLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={rename} className="font-mono text-xs">
                <Edit2 className="size-3.5 text-slate-500 dark:text-zinc-400" />
                Rename Profile…
              </Button>

              {confirmDel ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={del}
                    className="font-mono text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  >
                    <Trash2 className="size-3.5" />
                    Confirm Delete Profile
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDel(false)}
                    className="font-mono text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="font-mono text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  onClick={() => {
                    setConfirmDel(true);
                    setTimeout(() => setConfirmDel((c) => (c ? false : c)), 5000);
                  }}
                >
                  <Trash2 className="size-3.5" />
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
