import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Laptop, Moon, Sun } from "lucide-react";
import { api, setToken } from "@/lib/api";
import { keys, toast, useProxy, useSettings, useWorkers } from "@/lib/hooks";
import { useTheme, type Theme } from "@/lib/theme";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CountryChip, Mono } from "@/components/common";
import { cn } from "@/lib/utils";

export function Settings() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const { data: proxy } = useProxy();
  const { data: workers } = useWorkers();
  const workerMap = useMemo(() => new Map(workers?.map((w) => [w.name, w])), [workers]);
  const { theme, setTheme } = useTheme();
  const [tok, setTok] = useState("");

  async function saveToken() {
    if (!tok.trim()) return;
    setToken(tok.trim());
    toast("Token saved to this browser", "ok");
    setTok("");
    qc.invalidateQueries();
  }

  async function setAutoheal(v: boolean) {
    try {
      await api("POST", "/api/settings", { autoheal: v });
    } catch (e: any) {
      toast(e.message, "err");
    }
    qc.invalidateQueries({ queryKey: keys.settings });
  }

  async function togglePool(name: string, pool: boolean) {
    try {
      await api("POST", `/api/proxy/${name}`, { pool });
    } catch (e: any) {
      toast(e.message, "err");
    }
    qc.invalidateQueries({ queryKey: keys.proxy });
  }

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "dark", label: "Dark", icon: Moon },
    { id: "light", label: "Light", icon: Sun },
    { id: "system", label: "System", icon: Laptop },
  ];

  return (
    <div className="grid max-w-[1120px] gap-5 lg:grid-cols-2">
      {/* Theme Preference */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance &amp; Theme</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-xs">
          <p className="text-slate-500 dark:text-zinc-400">
            Select your preferred display theme for the control console.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-2.5 font-mono text-xs font-semibold transition-all",
                  theme === id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#202737] dark:bg-[#121622] dark:text-zinc-400 dark:hover:bg-[#161c28] dark:hover:text-zinc-200"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Control Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Control Authentication</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-xs">
          <p className="text-slate-500 dark:text-zinc-400">
            Authenticate API requests from this browser against the controller core.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={tok}
              onChange={(e) => setTok(e.target.value)}
              placeholder="Paste your CONTROL_TOKEN"
              autoComplete="off"
              className="font-mono text-xs"
            />
            <Button variant="primary" onClick={saveToken} className="font-mono text-xs uppercase">
              Save
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">Stored locally in your browser.</p>
        </CardBody>
      </Card>

      {/* Auto-Heal Watchdog */}
      <Card>
        <CardHeader className="justify-between">
          <CardTitle>Auto-Heal Watchdog</CardTitle>
          <Switch checked={!!settings?.autoheal} onCheckedChange={setAutoheal} />
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-xs">
          <p className="text-slate-500 dark:text-zinc-400">
            Automatically restarts tunnels that drop or enter an unhealthy state.
          </p>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-[#1d2230]">
            <span className="text-slate-400 dark:text-zinc-500">Alerts Webhook:</span>
            <Badge tone={settings?.webhook ? "ok" : "muted"} dot>
              {settings?.webhook ? "CONFIGURED" : "NOT SET"}
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* Multi-Exit Proxy Pool */}
      <Card className="lg:col-span-2">
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Multi-Exit Proxy Pool</CardTitle>
            {proxy && (
              <Badge tone={proxy.enabled ? "ok" : "muted"} dot>
                {proxy.enabled ? "ACTIVE" : "DISABLED"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-4 font-mono text-xs">
          <p className="text-slate-500 dark:text-zinc-400">
            Route traffic through any exit. Each healthy tunnel exposes an HTTP proxy on 127.0.0.1.
          </p>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-[#232838] dark:bg-[#090c12]">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 uppercase text-[11px] tracking-wider dark:text-zinc-500">
                Round-Robin Endpoint:
              </span>
              <span className="font-bold text-slate-900 text-sm dark:text-zinc-100">127.0.0.1:18080</span>
            </div>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText("http://127.0.0.1:18080");
                toast("Copied http://127.0.0.1:18080", "ok", 1200);
              }}
              className="text-xs uppercase"
            >
              <Copy className="size-3" /> Copy URL
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left font-mono text-2xs uppercase tracking-wider text-slate-400 dark:border-[#1d2230] dark:text-zinc-400">
                  <th className="px-3 py-2.5 font-semibold">Exit</th>
                  <th className="px-3 py-2.5 font-semibold">Region</th>
                  <th className="px-3 py-2.5 font-semibold">Local Port</th>
                  <th className="px-3 py-2.5 font-semibold">Proxy Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold">In Pool</th>
                </tr>
              </thead>
              <tbody>
                {proxy?.exits?.map((e) => {
                  const w = workerMap.get(e.name);
                  return (
                    <tr key={e.name} className="border-b border-slate-100 text-xs dark:border-[#181d28] last:border-0">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-zinc-200">{e.name}</td>
                      <td className="px-3 py-2.5"><CountryChip iso={w?.ipinfo?.country_iso} country={w?.ipinfo?.country} /></td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-zinc-300">:{e.port}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={e.online ? "ok" : "muted"} dot>
                          {e.online ? "ONLINE" : "OFFLINE"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Switch
                          checked={e.pool}
                          onCheckedChange={(v) => togglePool(e.name, v)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
