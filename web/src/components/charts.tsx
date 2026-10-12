import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Sparkline({ data, color = "hsl(var(--accent))", height = 36 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return <div style={{ height }} />;
  const w = 160;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`);
  const id = "sl" + Math.random().toString(36).slice(2, 7);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${height} ${pts.join(" ")} ${w},${height}`} fill={`url(#${id})`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface DonutSlice { label: string; value: number; color: string; }
export function Donut({ slices, size = 150 }: { slices: DonutSlice[]; size?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 16;
  let offset = 0;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#161b26" strokeWidth={stroke} />
        {slices.filter((s) => s.value > 0).map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy} transform={`rotate(90 ${cx} ${cy})`} textAnchor="middle" dominantBaseline="central"
          className="fill-white font-mono font-extrabold tabular-nums" style={{ fontSize: 26 }}>
          {total}
        </text>
      </svg>
      <div className="flex min-w-[150px] flex-1 flex-col gap-2.5 font-mono text-xs">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}88` }} />
            <span className="text-zinc-300 font-medium">{s.label}</span>
            <span className="ml-auto font-bold tabular-nums text-white">{s.value}</span>
            <span className="w-10 text-right text-[11px] tabular-nums text-zinc-500">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarRow { label: string; value: number; sub?: string; color?: string; }
export function HBars({ rows }: { rows: BarRow[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-3 font-mono">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[130px_1fr_auto] items-center gap-2.5">
          <span className="truncate text-xs font-semibold text-zinc-200">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full border border-[#202737] bg-[#141924]">
            <span className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, background: r.color || "#38bdf8", boxShadow: `0 0 8px ${r.color || "#38bdf8"}88` }} />
          </span>
          <span className="whitespace-nowrap text-xs font-medium tabular-nums text-zinc-400">{r.sub}</span>
        </div>
      ))}
    </div>
  );
}

export function ThroughputChart({ data, className }: { data: { t: number; rx: number; tx: number }[]; className?: string }) {
  return (
    <div className={cn("h-[210px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="gRx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gTx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--ok))" stopOpacity="0.22" />
              <stop offset="100%" stopColor="hsl(var(--ok))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis width={48} tickFormatter={(v) => fmtBytes(v) + "/s"} tick={{ fontSize: 10.5, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", fontSize: 12, boxShadow: "var(--tw-shadow)" }}
            labelFormatter={() => ""}
            formatter={(v: number, n) => [fmtBytes(v) + "/s", n === "rx" ? "Download" : "Upload"]}
          />
          <Area type="monotone" dataKey="rx" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#gRx)" isAnimationActive={false} />
          <Area type="monotone" dataKey="tx" stroke="hsl(var(--ok))" strokeWidth={2} fill="url(#gTx)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
