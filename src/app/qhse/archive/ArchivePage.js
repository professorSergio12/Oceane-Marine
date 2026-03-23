"use client";

import { useQhseLoading } from "@/app/qhse/QhseLoadingContext";

import { useEffect, useState } from "react";
import { useQhseSidebar } from "../QhseSidebarContext";
import Link from "next/link";

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);
  return years;
}

export default function ArchivePage() {
  const { setPageLoading } = useQhseLoading();
  const { contentClassName } = useQhseSidebar();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [moduleFilter, setModuleFilter] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  const yearOptions = getYearOptions();

  const handleDelete = async (row) => {
    if (!confirm(`Remove "${row.title || row.module}" from the archive? This cannot be undone.`)) return;
    setDeletingId(row._id);
    setError("");
    setActionMessage("");
    try {
      const res = await fetch(`/api/qhse/archive/${row._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setItems((prev) => prev.filter((i) => i._id !== row._id));
      setActionMessage("Archived file removed successfully.");
    } catch (err) {
      setError(err.message || "Failed to remove from archive");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPageLoading(true);
    setError("");
    const params = new URLSearchParams({ year: String(year) });
    if (moduleFilter) params.set("module", moduleFilter);
    fetch(`/api/qhse/archive/list?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || "Failed to load");
        setItems(data.data || []);
        if (Array.isArray(data.years) && data.years.length > 0) {
          setAvailableYears(data.years);
        }
        if (Array.isArray(data.modules)) {
          setAvailableModules(data.modules);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setPageLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [year, moduleFilter]);

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        <header className="mt-12 md:mt-0 mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="flex-shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div className="flex-1 flex flex-col items-center text-center w-full sm:w-auto">
            <p className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.25em] text-sky-300">
              QHSE
            </p>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Archive</h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Year-wise list of archived documents by submodule (e.g. Risk Assessment, Equipment Defects).
            </p>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-emerald-200 text-sm">
            {actionMessage}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex items-center justify-end gap-4 flex-wrap p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
              <select
                className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[5rem]"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {(availableYears.length ? availableYears : yearOptions).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Module</span>
              <select
                className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[10rem]"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="">All modules</option>
                {availableModules.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-300 text-sm">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-300 text-sm">
              No archived files for this year.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-200 border-collapse">
                <thead>
                  <tr className="bg-[#366092] text-white">
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide">
                      Module
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide">
                      Document type
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide">
                      Form code
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide">
                      Serial No
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide min-w-[180px]">
                      Title
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-32">
                      Archived on
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((row) => (
                    <tr
                      key={row._id}
                      className="hover:bg-white/5 bg-slate-800/30"
                    >
                      <td className="border border-slate-400/40 px-3 py-2">
                        {row.module || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2">
                        {row.documentType || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 font-mono text-sky-300">
                        {row.formCode || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 font-mono text-sky-300">
                        {row.metadata?.serialNumber ?? row.serialNumber ?? "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2">
                        {row.title || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2">
                        {row.archivedAt
                          ? new Date(row.archivedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {row.fileUrl && (row.fileUrl.startsWith("http://") || row.fileUrl.startsWith("https://")) ? (
                            <span className="relative group inline-flex">
                              <a
                                href={row.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download"
                                aria-label="Download"
                                className="p-1.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 transition inline-flex"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-slate-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                Download
                              </span>
                            </span>
                          ) : (
                            <span className="relative group inline-flex">
                              <a
                                href={`/api/qhse/archive/${row._id}/download`}
                                download
                                title="Download"
                                aria-label="Download"
                                className="p-1.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 transition inline-flex"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-slate-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                Download
                              </span>
                            </span>
                          )}
                          <span className="relative group inline-flex">
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              disabled={deletingId === row._id}
                              title="Delete"
                              aria-label="Delete"
                              className="p-1.5 rounded text-red-300 hover:text-red-200 hover:bg-red-500/10 disabled:opacity-50 transition"
                            >
                              {deletingId === row._id ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-slate-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                              Delete
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
