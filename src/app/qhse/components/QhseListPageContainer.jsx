"use client";

/**
 * Standard QHSE list page layout: one rounded container with
 * - Top row: search (left, flex-1) + filters (right)
 * - Below: children (messages + table)
 * Use same structure across all QHSE modules. Filter options stay per-module.
 */
export function QhseListPageContainer({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filterChildren,
  children,
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:min-w-0">
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {filterChildren}
        </div>
      </div>
      {children}
    </div>
  );
}
