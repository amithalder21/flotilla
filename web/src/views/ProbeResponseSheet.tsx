import type { ProbeRow } from "@/lib/types";
import { Sheet } from "@/components/ui/sheet";
import { SectionLabel } from "@/components/common";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel className="mb-1.5">{title}</SectionLabel>
      <pre className="max-h-[46vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-[12px] leading-relaxed text-slate-800 dark:border-[#1f2638] dark:bg-[#06080d] dark:text-zinc-200">
        {children}
      </pre>
    </div>
  );
}

export function ProbeResponseSheet({
  row,
  req,
  onClose,
}: {
  row: ProbeRow | null;
  req?: { method: string; url: string };
  onClose: () => void;
}) {
  const meta = row
    ? row.error
      ? "no response"
      : `${row.status} · ${row.size} B · ${row.ms}ms`
    : "";
  const hdrs = (row?.resp_headers || []).map(([k, v]) => `${k}: ${v}`).join("\n");

  return (
    <Sheet
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title={row ? `${row.exit}${row.country_iso ? ` · ${row.country_iso.toUpperCase()}` : ""}` : ""}
      meta={meta}
      width="680px"
    >
      {row && (
        <div className="flex-1 space-y-4 overflow-auto p-5">
          <Block title="Request">{`${req?.method || "GET"} ${req?.url || ""}`}</Block>
          {row.error ? (
            <Block title="Result">{row.error}</Block>
          ) : (
            <>
              {row.final_url && row.final_url !== req?.url && (
                <Block title="Final URL (after redirects)">{row.final_url}</Block>
              )}
              <Block title="Response headers">{`HTTP ${row.status}\n${hdrs}`}</Block>
              <Block title={`Response body${row.truncated ? " (truncated)" : ""}`}>
                {row.preview || "(empty)"}
              </Block>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
