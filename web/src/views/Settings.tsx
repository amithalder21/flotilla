import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { api, setToken } from "@/lib/api";
import { keys, toast, useProxy, useSettings } from "@/lib/hooks";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CountryChip, Mono } from "@/components/common";

export function Settings() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const { data: proxy } = useProxy();
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

  return (
    <div className="grid max-w-[1120px] gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader className="justify-between">
          <CardTitle>Control Authentication</CardTitle>
          <span className="rounded-full border border-[#252c3c] bg-[#141822] px-2 py-0.5 font-mono text-[10.5px] text-zinc-400 uppercase tracking-wider">
            API TOKEN
          </span>
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-xs text-zinc-400">
          <p className="leading-relaxed">
            Required for every fleet control call. Authorises this browser session against the controller core.
          </p>
          <div className="flex gap-2">
            <Input type="password" value={tok} onChange={(e) => setTok(e.target.value)} placeholder="Paste your CONTROL_TOKEN" autoComplete="off" className="font-mono text-xs" />
            <Button variant="primary" onClick={saveToken} className="font-mono uppercase text-xs">
              Save
            </Button>
          </div>
          <p className="text-[11px] text-zinc-500">Stored strictly in local browser storage.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="justify-between">
          <CardTitle>Auto-Heal Watchdog</CardTitle>
          <Switch checked={!!settings?.autoheal} onCheckedChange={setAutoheal} />
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-xs text-zinc-400 leading-relaxed">
          <p>
            When active, a background watchdog automatically restarts tunnels that drop or enter an unhealthy state.
          </p>
          <div className="flex items-center gap-2 pt-1 border-t border-[#1d2230]">
            <span className="text-zinc-500">Alerts Webhook:</span>
            <Badge tone={settings?.webhook ? "ok" : "muted"} dot>
              {settings?.webhook ? "CONFIGURED" : "NOT SET"}
            </Badge>
          </div>
        </CardBody>
      </Card>

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
          <p className="text-zinc-400 leading-relaxed">
            Route traffic through any exit. Each healthy tunnel exposes an HTTP proxy on <span className="text-zinc-200">127.0.0.1</span>.
            The round-robin endpoint automatically rotates requests across active exits.
          </p>

          <div className="flex items-center justify-between rounded-xl border border-[#232838] bg-[#090c12] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 uppercase text-[11px] tracking-wider">Round-Robin Endpoint:</span>
              <span className="font-bold text-zinc-100 text-sm">127.0.0.1:18080</span>
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
                <tr className="border-b border-[#1d2230] text-left font-mono text-2xs uppercase tracking-wider text-zinc-400">
                  <th className="py-3 pr-3 font-semibold">Exit Name</th>
                  <th className="px-3 py-3 font-semibold">Proxy Port</th>
                  <th className="px-3 py-3 font-semibold">State</th>
                  <th className="px-3 py-3 text-right font-semibold">In Rotation</th>
                </tr>
              </thead>
              <tbody>
                {!proxy?.exits.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-zinc-500">
                      No exits in the pool yet — connect a tunnel to register an egress proxy.
                    </td>
                  </tr>
                )}
                {proxy?.exits.map((e) => (
                  <tr key={e.name} className="border-b border-[#181d28] last:border-0 hover:bg-[#121622]/60 transition-colors">
                    <td className="py-3 pr-3 font-bold text-zinc-200">{e.name}</td>
                    <td className="px-3 py-3 text-zinc-300">127.0.0.1:{e.port}</td>
                    <td className="px-3 py-3">
                      <Badge tone={e.online ? "ok" : "muted"} dot>
                        {e.online ? "ONLINE" : "OFFLINE"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Switch checked={e.pool} onCheckedChange={(v) => togglePool(e.name, v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Flotilla Core Info</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 font-mono text-xs leading-relaxed text-zinc-400">
          <div>
            <strong className="text-zinc-200">Flotilla</strong> — One Control Plane for Every Exit.
          </div>
          <div>
            High-density multi-egress VPN controller with live streaming metrics, distributed probing, and multi-exit proxy routing.
          </div>
          <div className="pt-1">
            <a href="https://github.com/amithalder21/flotilla" target="_blank" rel="noopener" className="text-sky-400 hover:underline">
              https://github.com/amithalder21/flotilla
            </a>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
