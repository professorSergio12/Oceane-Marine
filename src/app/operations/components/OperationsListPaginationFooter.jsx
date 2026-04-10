"use client";

const DEFAULT_SIZES = [10, 25, 50, 100];

/**
 * Shared table footer: range text, rows-per-page, prev/next.
 */
export default function OperationsListPaginationFooter({
  totalFiltered,
  page,
  setPage,
  totalPages,
  pageStart,
  pageEnd,
  pageSize,
  setPageSize,
  pageSizeOptions = DEFAULT_SIZES,
  className = "",
}) {
  if (totalFiltered <= 0) return null;

  return (
    <div
      className={`flex flex-col gap-3 border-t border-white/10 bg-white/3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
        <span>
          Showing{" "}
          <span className="font-semibold text-white">
            {pageStart}–{pageEnd}
          </span>{" "}
          of <span className="font-semibold text-white">{totalFiltered}</span>
        </span>
        <label className="flex items-center gap-2">
          <span className="text-white/50">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="theme-select rounded-lg px-2 py-1 text-xs uppercase tracking-wide"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-20 text-center text-sm text-white/80">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
