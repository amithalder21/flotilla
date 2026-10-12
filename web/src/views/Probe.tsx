import { useState } from "react";
import { Radar, Terminal } from "lucide-react";
import { api } from "@/lib/api";
import { toast, useWorkers } from "@/lib/hooks";
import { looksLikeCurl, parseCurl, type CurlParsed } from "@/lib/curl";
import type { ProbeResult, ProbeRow } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CountryChip, DiffBadge } from "@/components/common";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProbeResponseSheet } from "./ProbeResponseSheet";
import { ProbeFanOut } from "@/components/ProbeFanOut";

const METHODS = ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"];

export function Probe() {
  const { data: workers = [] } = useWorkers();
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [baseline, setBaseline] = useState(false);
  const [follow, setFollow] = useState(true);
  const [timeout, setTimeoutS] = useState(20);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<ProbeRow | null>(null);
  const [advOpen, setAdvOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const online = workers.filter((w) => w.exists && w.vpn === "running" && w.health === "healthy").length;

  function parseHeaders() {
    const out: Record<string, string> = {};
    headers.split("\n").forEach((l) => {
      const i = l.indexOf(":");
      if (i < 1) return;
      const k = l.slice(0, i).trim();
      if (k) out[k] = l.slice(i + 1).trim();
    });
    return out;
  }

  function applyCurl(p: CurlParsed): boolean {
    setMethod(METHODS.includes(p.method) ? p.method : "GET");
    setUrl(p.url);
    const hdrLines = Object.entries(p.headers).map(([k, v]) => `${k}: ${v}`);
    setHeaders(hdrLines.join("\n"));
    setBody(p.body);
    setFollow(p.follow);
    if (hdrLines.length || p.body) setAdvOpen(true);
    toast(`Imported curl ${p.method} request`, "ok");
    return true;
  }

  function importCurl(text: string): boolean {
    const p = parseCurl(text);
    if (!p) {
      toast("Could not parse curl command", "err");
      return false;
    }
    return applyCurl(p);
  }

  async function run() {
    if (!url.trim()) {
      toast("Enter a URL to probe", "err");
      return;
    }
    setBusy(true);
    try {
      const r = await api<ProbeResult>("POST", "/api/probe", {
        url: url.trim(),
        method,
        headers: parseHeaders(),
        body,
        baseline,
        follow,
        timeout,
      });
      r.req = { method, url: r.url };
      setResult(r);
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  const allRows = result ? [...result.rows, ...(result.direct ? [result.direct] : [])] : [];
  const outliers = result?.rows.filter((r) => r.diff === "outlier").length ?? 0;
  const errs = result?.rows.filter((r) => r.diff === "error").length ?? 0;
  const summary = result
    ? result.all_unique && result.count - errs > 1
      ? `${result.count} exits · all unique · ${errs} unreachable`
      : `${result.count} exits · ${outliers} differ · ${errs} unreachable`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Distributed Fleet Probe</CardTitle>
            <span className="rounded-full border border-sky-500/30 bg-sky-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 tabular-nums uppercase dark:bg-sky-950/40 dark:text-sky-400">
              {online ? `${online} ${online === 1 ? "ONLINE EXIT" : "ONLINE EXITS"}` : "NO ONLINE EXITS"}
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-3.5 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-28 font-mono text-xs">
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (looksLikeCurl(text)) {
                  e.preventDefault();
                  importCurl(text);
                }
              }}
              placeholder="https://target.example.com/api  (or paste a curl command)"
              className="min-w-[260px] flex-1 font-mono text-xs"
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <Button variant="primary" onClick={run} disabled={busy} className="font-mono text-xs uppercase tracking-wider">
              <Radar className="size-3.5" /> {busy ? "Radiating Request…" : "Dispatch Across Fleet"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-[#232a3b] dark:bg-[#121622] dark:text-zinc-400 dark:hover:border-[#2f3950] dark:hover:text-zinc-200"
            >
              <Terminal className="size-3.5" /> Import curl
            </button>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
              Auto-populates method, URL, headers, and payload.
            </span>
          </div>

          {showImport && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono dark:border-[#232838] dark:bg-[#090c12]">
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (looksLikeCurl(text)) {
                    e.preventDefault();
                    setImportText(text);
                    if (importCurl(text)) setShowImport(false);
                  }
                }}
                placeholder={"curl 'https://example.com/api' \\\n  -X POST \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{\"q\":1}'"}
                className="min-h-[110px] font-mono text-xs"
              />
              <div className="mt-2.5 flex items-center gap-2">
                <Button size="sm" variant="primary" onClick={() => { if (importCurl(importText)) setShowImport(false); }}>
                  Apply to Form
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setImportText(""); setShowImport(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <details open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer font-mono text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200">
              Headers &amp; request body (optional)
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-3">
              <div className="min-w-[240px] flex-1">
                <div className="mb-1 text-[11px] text-slate-500 dark:text-zinc-500 font-mono">Headers — one per line, <span className="text-slate-700 dark:text-zinc-300">Name: value</span></div>
                <Textarea value={headers} onChange={(e) => setHeaders(e.target.value)} className="min-h-[72px] font-mono text-xs" placeholder={"User-Agent: Mozilla/5.0\nAccept-Language: en-US"} />
              </div>
              <div className="min-w-[240px] flex-1">
                <div className="mb-1 text-[11px] text-slate-500 dark:text-zinc-500 font-mono">Request body (POST/PUT/PATCH)</div>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[72px] font-mono text-xs" />
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-5 pt-1 font-mono text-xs text-slate-600 dark:text-zinc-400">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="size-3.5 accent-emerald-500 rounded border-slate-300 bg-white dark:border-[#2b3548] dark:bg-[#161a24]" checked={baseline} onChange={(e) => setBaseline(e.target.checked)} />
              Direct baseline row
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="size-3.5 accent-emerald-500 rounded border-slate-300 bg-white dark:border-[#2b3548] dark:bg-[#161a24]" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
              Follow redirects
            </label>
            <label className="flex items-center gap-2">
              Timeout
              <input type="number" min={1} max={60} value={timeout} onChange={(e) => setTimeoutS(+e.target.value || 20)} className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 tabular-nums dark:border-[#232838] dark:bg-[#090c12] dark:text-zinc-200" />
              s
            </label>
          </div>
        </CardBody>
      </Card>

      {/* Radial Fan-Out Visualizer */}
      <ProbeFanOut
        workers={workers}
        busy={busy}
        result={result}
        url={url}
        method={method}
        onSelectRow={(row) => setOpen(row)}
      />

      <Card>
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Consensus Matrix</CardTitle>
            {summary && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 tabular-nums dark:border-[#232838] dark:bg-[#141822] dark:text-zinc-300">
                {summary}
              </span>
            )}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left font-mono text-2xs uppercase tracking-wider text-slate-500 dark:border-[#1d2230] dark:text-zinc-400">
                {["Exit", "Country", "Status", "Size", "Content Type", "Server", "Hash", "Latency", "Diff"].map((h) => (
                  <th key={h} className={cn("px-3 py-3 font-semibold", h === "Latency" && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!allRows.length && (
                <tr>
                  <td colSpan={9} className="py-10 text-center font-mono text-xs text-slate-400 dark:text-zinc-500">
                    No probe dispatched yet. Enter a target URL above to test.
                  </td>
                </tr>
              )}
              {allRows.map((r, i) => (
                <tr
                  key={r.exit + i}
                  onClick={() => setOpen({ ...r, ...({} as any) })}
                  className={cn(
                    "cursor-pointer border-b border-slate-100 text-xs transition-colors last:border-0 hover:bg-slate-50/80 dark:border-[#181d28] dark:hover:bg-[#121622]/80",
                    r.diff === "outlier" && "bg-amber-50/60 dark:bg-amber-950/20 border-l-2 border-l-amber-500",
                    r.error && "text-slate-400 dark:text-zinc-500",
                  )}
                >
                  <td className="px-3 py-3 font-mono font-bold text-slate-900 dark:text-zinc-200">{r.exit}</td>
                  <td className="px-3 py-3"><CountryChip iso={r.country_iso} country={r.country} /></td>
                  {r.error ? (
                    <td colSpan={5} className="px-3 py-3 font-mono text-rose-600 dark:text-rose-400 text-xs">{r.error}</td>
                  ) : (
                    <>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-slate-900 dark:text-zinc-100">{r.status}</td>
                      <td className="px-3 py-3 font-mono tabular-nums text-slate-700 dark:text-zinc-300">{fmtBytes(r.size)}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 dark:text-zinc-400">{r.ctype || "—"}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 dark:text-zinc-400">{r.server || "—"}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-slate-400 dark:text-zinc-500">{r.hash || "—"}</td>
                    </>
                  )}
                  <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-zinc-200">{r.ms != null ? `${r.ms}ms` : "—"}</td>
                  <td className="px-3 py-3"><DiffBadge diff={r.diff} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ProbeResponseSheet row={open} req={result?.req} onClose={() => setOpen(null)} />
    </div>
  );
}
