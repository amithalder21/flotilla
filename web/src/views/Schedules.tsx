import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { keys, toast, useScripts, useSchedules } from "@/lib/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common";
import { fmtRelative, fmtTime } from "@/lib/format";

export function Schedules() {
  const qc = useQueryClient();
  const { data: schedules = [] } = useSchedules();
  const { data: scripts = [] } = useScripts();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.schedules });

  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 3 * * *");
  const [script, setScript] = useState("");
  const [body, setBody] = useState("");
  const [timeout, setTimeoutS] = useState(300);

  async function create() {
    if (!name.trim()) return toast("Name the schedule first", "err");
    const payload: any = { name, cron, targets: "all", timeout };
    if (script) payload.script = script;
    else payload.body = body;
    try {
      await api("POST", "/api/schedules", payload);
      toast("Schedule created", "ok");
      setName("");
      setBody("");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  async function toggle(id: string, enabled: boolean) {
    try {
      await api("POST", `/api/schedules/${id}`, { enabled });
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }
  async function runNow(id: string) {
    try {
      await api("POST", `/api/schedules/${id}/run`, {});
      toast("Schedule triggered", "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }
  async function del(id: string) {
    try {
      await api("DELETE", `/api/schedules/${id}`);
      toast("Schedule deleted", "ok");
    } catch (e: any) {
      toast(e.message, "err");
    }
    refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Create Fleet Schedule</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1.5 font-mono text-xs text-slate-500 dark:text-zinc-400">
              Schedule Name
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily Egress Health Check" className="font-sans text-xs" />
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-xs text-slate-500 dark:text-zinc-400">
              Cron Expression (m h dom mon dow)
              <Input value={cron} onChange={(e) => setCron(e.target.value)} className="font-mono text-xs" />
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-xs text-slate-500 dark:text-zinc-400">
              Timeout (seconds)
              <Input type="number" value={timeout} onChange={(e) => setTimeoutS(+e.target.value || 300)} className="font-mono text-xs tabular-nums" />
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-xs text-slate-500 dark:text-zinc-400 md:col-span-1">
              Script Preset
              <Select value={script} onChange={(e) => setScript(e.target.value)} className="font-mono text-xs">
                <option value="">Inline bash command →</option>
                {scripts.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </label>
            {!script && (
              <label className="flex flex-col gap-1.5 font-mono text-xs text-slate-500 dark:text-zinc-400 md:col-span-2">
                Inline Bash Command
                <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="curl -s https://ifconfig.co/json" className="font-mono text-xs" />
              </label>
            )}
          </div>
          <div className="pt-1">
            <Button variant="primary" onClick={create} className="font-mono text-xs uppercase tracking-wider">
              Create Schedule
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Active Recurring Jobs</CardTitle>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 tabular-nums dark:border-[#252c3c] dark:bg-[#141822] dark:text-zinc-300">
              {schedules.length} {schedules.length === 1 ? "SCHEDULE" : "SCHEDULES"}
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left font-mono text-2xs uppercase tracking-wider text-slate-500 dark:border-[#1d2230] dark:text-zinc-400">
                <th className="px-5 py-3 font-semibold">Name & Command</th>
                <th className="px-3 py-3 font-semibold">Cron Pattern</th>
                <th className="px-3 py-3 font-semibold">Last Execution</th>
                <th className="px-3 py-3 font-semibold">Next Trigger</th>
                <th className="px-3 py-3 font-semibold">Enabled</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!schedules.length && (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-mono text-xs text-slate-400 dark:text-zinc-500">
                    No recurring schedules configured yet — create one above.
                  </td>
                </tr>
              )}
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors dark:border-[#181d28] dark:hover:bg-[#121622]/70">
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-200">{s.name}</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">{s.script || s.body}</div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs text-sky-600 dark:text-sky-400 font-semibold">{s.cron}</td>
                  <td className="px-3 py-3.5 font-mono text-xs">
                    {s.last_run ? (
                      <span className="text-slate-800 dark:text-zinc-300 tabular-nums">{fmtRelative(s.last_run)}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-600">—</span>
                    )}
                    {s.last_status && <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono mt-0.5">{s.last_status}</div>}
                  </td>
                  <td className="px-3 py-3.5 font-mono text-xs text-slate-600 dark:text-zinc-400 tabular-nums">{s.next_run ? fmtTime(s.next_run) : "—"}</td>
                  <td className="px-3 py-3.5">
                    <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.id, v)} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" title="Run now" onClick={() => runNow(s.id)} className="text-slate-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400">
                        <Play className="size-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-slate-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400" title="Delete" onClick={() => del(s.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
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
