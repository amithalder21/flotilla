import { useState } from "react";
import { Radar, Terminal } from "lucide-react";
import { api } from "@/lib/api";
import { toast, useWorkers } from "@/lib/hooks";
import { looksLikeCurl, parseCurl, type CurlParsed } from "@/lib/curl";
import type { ProbeResult, ProbeRow } from "@/lib/types";
import { Card, CardBody, CardHeader, CardSub, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CountryChip, DiffBadge, EmptyState } from "@/components/common";
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
    const bits = [`${p.method} request`];
    if (hdrLines.length) bits.push(`${hdrLines.length} header${hdrLines.length > 1 ? "s" : ""}`);
    if (p.body) bits.push("body");
    toast(`Imported from curl — ${bits.join(", ")}`, "ok");
    return true;
  }

  function importCurl(text: string): boolean {
    const p = parseCurl(text);
    if (!p) {
      toast("Could not parse that as a curl command", "err");
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
      ? `${result.count} exits · all responses unique · ${errs} unreachable`
      : `${result.count} exits · ${outliers} differ · ${errs} unreachable`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2.5">
            <CardTitle>Distributed Fleet Probe</CardTitle>
            <span className="rounded-full border border-sky-500/30 bg-sky-950/40 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-400 tabular-nums uppercase">
              {online ? `${online} ${online === 1 ? "ONLINE EXIT" : "ONLINE EXITS"}` : "NO ONLINE EXITS"}
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-3 font-mono text-xs">
          <p className="text-zinc-400 leading-relaxed">
            Dispatch one HTTP request simultaneously through every online egress tunnel. Divergent responses are automatically flagged to detect geo-restrictions, regional CDNs, WAFs, or DNS differences.
          </p>
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#232a3b] bg-[#121622] px-2.5 py-1 font-mono text-xs text-zinc-400 transition-colors hover:border-[#2f3950] hover:text-zinc-200"
            >
              <Terminal className="size-3.5" /> Import from curl
            </button>
            <span className="text-[11px] text-zinc-500 font-mono">
              Paste a <span className="text-zinc-400">curl</span> command — method, URL, headers and body populate automatically.
            </span>
          </div>
          {showImport && (
            <div className="rounded-xl border border-[#232838] bg-[#090c12] p-3.5 font-mono">
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
                className="min-h-[120px] font-mono text-xs"
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
            <summary className="cursor-pointer font-mono text-xs text-zinc-400 hover:text-zinc-200">Headers &amp; request body (optional)</summary>
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="min-w-[240px] flex-1">
                <div className="mb-1 text-[11px] text-zinc-500 font-mono">Headers — one per line, <span className="text-zinc-400">Name: value</span></div>
                <Textarea value={headers} onChange={(e) => setHeaders(e.target.value)} className="min-h-[72px] font-mono text-xs" placeholder={"User-Agent: Mozilla/5.0\nAccept-Language: en-US"} />
              </div>
              <div className="min-w-[240px] flex-1">
                <div className="mb-1 text-[11px] text-zinc-500 font-mono">Request body (POST/PUT/PATCH)</div>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[72px] font-mono text-xs" />
              </div>
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-5 pt-1 font-mono text-xs text-zinc-400">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="size-3.5 accent-emerald-500 rounded bg-[#161a24] border-[#2b3548]" checked={baseline} onChange={(e) => setBaseline(e.target.checked)} />
              Direct (no-VPN) baseline row
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="size-3.5 accent-emerald-500 rounded bg-[#161a24] border-[#2b3548]" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
              Follow redirects
            </label>
            <label className="flex items-center gap-2">
              Timeout
              <input type="number" min={1} max={60} value={timeout} onChange={(e) => setTimeoutS(+e.target.value || 20)} className="h-8 w-16 rounded-lg border border-[#232838] bg-[#090c12] px-2 font-mono text-xs text-zinc-200 tabular-nums" />
              s
            </label>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">Click any result row in the consensus matrix below to inspect the full response details.</p>
        </CardBody>
      </Card>

      {/* Radial Fan-Out Animation: Request visibly radiating to every exit, lighting up as responses land */}
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
            <CardTitle>Probe Consensus Matrix</CardTitle>
            {summary && (
              <span className="rounded-full border border-[#232838] bg-[#141822] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-300 tabular-nums">
                {summary}
              </span>
            )}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#1d2230] text-left font-mono text-2xs uppercase tracking-wider text-zinc-400">
                {["Exit", "Country", "Status", "Payload Size", "Content Type", "Server Header", "Hash", "Latency", "Diff Status"].map((h) => (
                  <th key={h} className={cn("px-3 py-3 font-semibold", h === "Latency" && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!allRows.length && (
                <tr>
                  <td colSpan={9} className="py-10 text-center font-mono text-xs text-zinc-500">
                    Enter a target URL and trigger dispatch above to inspect multi-exit responses.
                  </td>
                </tr>
              )}
              {allRows.map((r, i) => (
                <tr
                  key={r.exit + i}
                  onClick={() => setOpen({ ...r, ...({} as any) })}
                  className={cn(
                    "cursor-pointer border-b border-[#181d28] text-xs transition-colors last:border-0 hover:bg-[#121622]/80",
                    r.diff === "outlier" && "bg-amber-950/20 border-l-2 border-l-amber-500",
                    r.error && "text-zinc-500",
                  )}
                >
                  <td className="px-3 py-3 font-mono font-bold text-zinc-200">{r.exit}</td>
                  <td className="px-3 py-3"><CountryChip iso={r.country_iso} country={r.country} /></td>
                  {r.error ? (
                    <td colSpan={5} className="px-3 py-3 font-mono text-rose-400 text-xs">{r.error}</td>
                  ) : (
                    <>
                      <td className="px-3 py-3 font-mono font-bold tabular-nums text-zinc-100">{r.status}</td>
                      <td className="px-3 py-3 font-mono tabular-nums text-zinc-300">{fmtBytes(r.size)}</td>
                      <td className="px-3 py-3 font-mono text-zinc-400">{r.ctype || "—"}</td>
                      <td className="px-3 py-3 font-mono text-zinc-400">{r.server || "—"}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-zinc-500">{r.hash || "—"}</td>
                    </>
                  )}
                  <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums text-zinc-200">{r.ms != null ? `${r.ms}ms` : "—"}</td>
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
