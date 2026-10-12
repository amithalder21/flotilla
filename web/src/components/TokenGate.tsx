import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TokenGate({ onAuthed }: { onAuthed: () => void }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = val.trim();
    if (!t) return;
    setBusy(true);
    setErr("");
    setToken(t);
    try {
      await api("GET", "/api/settings");
      onAuthed();
    } catch {
      setErr("That token was rejected. Check it and try again.");
      setToken("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#080a0f] bg-grid px-4 text-white">
      <form onSubmit={submit} className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#212638] bg-[#0d1017] p-7 shadow-2xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="font-mono text-lg font-bold tracking-tight text-white">Flotilla</div>
            <div className="font-mono text-2xs uppercase tracking-wider text-zinc-500">Fleet Control Session</div>
          </div>
        </div>
        <p className="mb-4 font-mono text-xs text-zinc-400">
          Enter your <span className="text-zinc-200">CONTROL_TOKEN</span> to authenticate this browser with the fleet controller.
        </p>
        <Input
          type="password"
          autoFocus
          placeholder="Paste CONTROL_TOKEN…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoComplete="off"
          className="font-mono text-xs"
        />
        {err && <p className="mt-2 font-mono text-xs text-rose-400">{err}</p>}
        <Button type="submit" variant="primary" className="mt-4 w-full font-mono text-xs uppercase tracking-wider" disabled={busy}>
          {busy ? "Verifying Token…" : "Authenticate Session"}
        </Button>
        <p className="mt-3 text-center font-mono text-[11px] text-zinc-500">Persisted strictly in local browser storage.</p>
      </form>
    </div>
  );
}
