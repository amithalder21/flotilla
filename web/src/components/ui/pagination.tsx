import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = "items",
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipsis
  const pages = React.useMemo(() => {
    const items: (number | "dots")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push("dots");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) items.push(i);
      if (currentPage < totalPages - 2) items.push("dots");
      items.push(totalPages);
    }
    return items;
  }, [currentPage, totalPages]);

  if (totalItems <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 bg-slate-50/60 px-4 py-3 font-mono text-xs dark:border-[#1d2334] dark:bg-[#0a0d14]",
        className,
      )}
    >
      {/* Left: Range and summary */}
      <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400">
        <span>
          Showing{" "}
          <strong className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
            {startItem}–{endItem}
          </strong>{" "}
          of{" "}
          <strong className="font-semibold text-slate-900 dark:text-zinc-100 tabular-nums">
            {totalItems}
          </strong>{" "}
          {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-[#1f2638]">
            <span className="text-2xs uppercase tracking-wider text-slate-400 dark:text-zinc-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-6 rounded border border-slate-200 bg-white px-1.5 py-0 font-mono text-[11px] text-slate-700 outline-none hover:border-slate-300 dark:border-[#22293a] dark:bg-[#121622] dark:text-zinc-300 dark:hover:border-[#2d374f] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(1)}
            title="First page"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-[#22293a] dark:bg-[#121622] dark:text-zinc-400 dark:hover:bg-[#191f2e] dark:hover:text-zinc-200 shadow-2xs"
          >
            <ChevronsLeft className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Previous page"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-[#22293a] dark:bg-[#121622] dark:text-zinc-400 dark:hover:bg-[#191f2e] dark:hover:text-zinc-200 shadow-2xs"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 px-1">
            {pages.map((p, i) =>
              p === "dots" ? (
                <span
                  key={`dots-${i}`}
                  className="px-1 text-slate-400 dark:text-zinc-600 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-all",
                    currentPage === p
                      ? "border border-emerald-600 bg-emerald-600 text-white shadow-xs dark:border-emerald-500/80 dark:bg-emerald-600"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-[#22293a] dark:bg-[#121622] dark:text-zinc-300 dark:hover:bg-[#1a2130] dark:hover:text-white shadow-2xs",
                  )}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Next page"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-[#22293a] dark:bg-[#121622] dark:text-zinc-400 dark:hover:bg-[#191f2e] dark:hover:text-zinc-200 shadow-2xs"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Last page"
            className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-[#22293a] dark:bg-[#121622] dark:text-zinc-400 dark:hover:bg-[#191f2e] dark:hover:text-zinc-200 shadow-2xs"
          >
            <ChevronsRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
