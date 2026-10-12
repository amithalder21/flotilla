import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { api, sseUrl } from "@/lib/api";
import { toast, useJobs, useScripts, useWorkers } from "@/lib/hooks";
import { Card, CardBody, CardHeader, CardSub, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Pane {
  worker: string;
  lines: string;
  state: "running" | "done" | "err";
  code?: string;
}

export function Run() {
  const { data: workers = [] } = useWorkers();
  const { data: scripts = [] } = useScripts();
  const { data: jobs = [], refetch: refetchJobs } = useJobs();

  const [cmd, setCmd] = useState("curl -s https://ifconfig.co/country-iso");
  const [script, setScript] = useState("");
  const [timeout, setTimeoutS] = useState(60);
  const [panes, setPanes] = useState<Record<string, Pane>>({});
  const [jobState, setJobState] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const srcRef = useRef<EventSource | null>(null);

  useEffect(() => () => srcRef.current?.close(), []);

  async function run() {
    srcRef.current?.close();
    setPanes({});
    setJobState("starting…");
    const payload: any = script ? { script } : { body: cmd };
    payload.targets = "all";
    payload.timeout = timeout;
    try {
      const r = await api<{ job: string; targets: string[] }>("POST", "/api/run", payload);
      setJobId(r.job);
      const init: Record<string, Pane> = {};
      for (const t of r.targets) init[t] = { worker: t, lines: "", state: "running" };
      setPanes(init);
      setJobState(`0/${r.targets.length} done`);
      const src = new EventSource(sseUrl(`/api/jobs/${r.job}/stream`));
      srcRef.current = src;
      let done = 0;
      const total = r.targets.length;
      src.onmessage = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.event === "done") {
          setJobState("finished");
          src.close();
          refetchJobs();
          return;
        }
        if (d.event === "start") return;
        if (d.event === "cancel") {
          toast(`Cancelled — killed ${d.total} process(es)`, "ok");
          return;
        }
        if (d.event === "exit") {
          done++;
          setJobState(`${done}/${total} done`);
          setPanes((p) => ({
            ...p,
            [d.worker]: {
              ...p[d.worker],
              worker: d.worker,
              lines: (p[d.worker]?.lines || "") + (d.line || ""),
              state: d.code === "0" ? "done" : "err",
              code: d.code,
            },
          }));
          return;
        }
        if (d.line !== undefined && d.worker) {
          setPanes((p) => ({
            ...p,
            [d.worker]: { ...(p[d.worker] || { worker: d.worker, state: "running" }), worker: d.worker, lines: (p[d.worker]?.lines || "") + d.line },
          }));
        }
      };
      src.onerror = () => setJobState("stream error");
    } catch (e: any) {
      toast(e.message, "err");
      setJobState("");
    }
  }

  async function cancel() {
    if (!jobId) return;
    try {
      const r = await api<{ killed: number }>("POST", `/api/jobs/${jobId}/cancel`, {});
      toast(`Cancelling — killed ${r.killed} process(es)`, "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  const online = workers.filter((w) => w.exists && w.vpn === "running").length;
  const paneList = Object.values(panes);
  const stateLabel = (p: Pane) =>
    p.state === "running" ? "running…" : p.code === "124" ? "timed out" : p.code === "143" ? "cancelled" : p.code === "0" ? "exit 0" : `exit ${p.code}`;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Fleet Command Execution</CardTitle>
            <span className="rounded-full border border-sky-500/30 bg-sky-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 tabular-nums dark:bg-sky-950/40 dark:text-sky-400">
              {online} {online === 1 ? "TARGET ONLINE" : "TARGETS ONLINE"}
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={script} onChange={(e) => setScript(e.target.value)} className="w-60 font-mono text-xs">
              <option value="">Inline bash command ↓</option>
              {scripts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-zinc-400">
              Timeout
              <input
                type="number"
                min={1}
                max={3600}
                value={timeout}
                onChange={(e) => setTimeoutS(+e.target.value || 60)}
                className="h-9 w-20 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800 font-mono tabular-nums dark:border-[#232838] dark:bg-[#090c12] dark:text-zinc-200"
              />
              s
            </label>
            <div className="flex-1" />
            <Button variant="primary" onClick={run} disabled={!online} className="font-mono text-xs uppercase tracking-wider">
              <Play className="size-3.5" /> Execute across fleet
            </Button>
          </div>
          {!script && (
            <Textarea
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              spellCheck={false}
              placeholder="#!/bin/bash&#10;curl -s https://ifconfig.co/json"
              className="min-h-[110px] font-mono text-xs leading-relaxed text-slate-900 dark:text-zinc-200"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  run();
                }
              }}
            />
          )}
        </CardBody>
      </Card>

      {paneList.length > 0 && (
        <Card>
          <CardHeader className="justify-between">
            <div className="flex items-center gap-2.5">
              <CardTitle>Live Terminal Stream</CardTitle>
              <CardSub>{jobState}</CardSub>
            </div>
            {jobState !== "finished" && (
              <Button size="xs" variant="danger" onClick={cancel} className="font-mono text-xs">
                <Square className="size-3" /> Cancel execution
              </Button>
            )}
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              {paneList.map((p) => (
                <div key={p.worker} className="flex flex-col overflow-hidden rounded-xl border border-[#222738] bg-[#07090e] shadow-xl">
                  {/* macOS Terminal Title Bar */}
                  <div className="flex items-center justify-between border-b border-[#1b202e] bg-[#0d1017] px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 opacity-60">
                        <span className="size-2 rounded-full bg-[#ff5f56]" />
                        <span className="size-2 rounded-full bg-[#ffbd2e]" />
                        <span className="size-2 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="font-mono text-xs font-bold text-zinc-200 ml-1.5">{p.worker}</span>
                    </div>
                    <span className={cn(
                      "rounded-full px-2 py-0.2 font-mono text-[10px] font-bold uppercase tracking-wider border",
                      p.state === "done" ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400" :
                      p.state === "err" ? "border-rose-500/40 bg-rose-950/40 text-rose-400" :
                      "border-amber-500/40 bg-amber-950/40 text-amber-300 animate-pulse"
                    )}>
                      {stateLabel(p)}
                    </span>
                  </div>
                  <pre className="max-h-64 min-h-[70px] overflow-auto p-3.5 font-mono text-xs leading-relaxed text-[#c7d2df] selection:bg-emerald-500/30">
                    {p.lines || (p.state === "running" ? "streaming stdout / stderr…" : "(no output)")}
                  </pre>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Recent Job History</CardTitle>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-slate-700 dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-400">
              LAST 6H
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left font-mono text-2xs uppercase tracking-wider text-slate-500 dark:border-[#1d2230] dark:text-zinc-400">
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-3 py-3 font-semibold">Command / Script</th>
                <th className="px-3 py-3 font-semibold">Exits</th>
                <th className="px-5 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {!jobs.length && (
                <tr>
                  <td colSpan={4} className="py-8 text-center font-mono text-xs text-slate-400 dark:text-zinc-500">
                    No jobs recorded yet — execute a command above to view history.
                  </td>
                </tr>
              )}
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors dark:border-[#181d28] dark:hover:bg-[#121622]/60">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500 tabular-nums dark:text-zinc-400">{fmtRelative(j.ts)}</td>
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-900 dark:text-zinc-200">{j.label}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600 tabular-nums dark:text-zinc-400">{j.targets.length} exits</td>
                  <td className="px-5 py-3 text-right">
                    <Badge tone={j.status === "done" ? "ok" : j.status === "running" ? "warn" : "muted"} dot>
                      {j.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
