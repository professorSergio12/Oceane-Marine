"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQhseSidebar } from "../QhseSidebarContext";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: 16 }, (_, i) => currentYear - i).map((y) => ({ value: String(y), label: String(y) })),
];

export default function ControlledDocumentRegisterPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const url = year
        ? `/api/qhse/controlled-document-register/dynamic?year=${encodeURIComponent(year)}`
        : "/api/qhse/controlled-document-register/dynamic";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const totalDocuments = items.reduce((sum, r) => sum + (r.documents ?? r.documentCount ?? 0), 0);

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE
            </p>
            <h1 className="text-2xl font-bold text-white">Controlled Document Register</h1>
            <p className="text-sm text-slate-200 mt-1">
              Live index of all controlled forms and documents (QHSE, Operations, PMS). Click a row to go to the module.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="theme-select rounded-full px-3 py-1.5 text-sm tracking-wide bg-slate-800 border border-white/20 text-white focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 outline-none cursor-pointer"
                aria-label="Filter documents by year"
              >
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <span>
                <span className="text-white font-semibold">{items.length}</span> form types
              </span>
              <span>
                <span className="text-white font-semibold">{totalDocuments}</span> total documents
              </span>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-300 text-sm">
              Loading document register…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-300 text-sm">
              No documents found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-200 border-collapse">
                <thead>
                  <tr className="bg-[#366092] text-white">
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-12">
                      No
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide min-w-[100px]">
                      Form Code
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide min-w-[200px]">
                      Title
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-24 text-center">
                      Documents
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-28">
                      Issue Date
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-20 text-center">
                      Rev No
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-28">
                      Department
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-20 text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((row, index) => (
                    <tr
                      key={(row.formCode || row.title) + index}
                      onClick={() => row.href && router.push(row.href)}
                      className="hover:bg-sky-500/10 bg-slate-800/30 cursor-pointer transition"
                      title={`Go to ${row.title}`}
                    >
                      <td className="border border-slate-400/40 px-3 py-2 text-slate-400">
                        {index + 1}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 font-mono text-sky-300">
                        {row.formCode || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-white">
                        {row.title || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-center">
                        {(row.documents ?? row.documentCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                            {row.documents ?? row.documentCount ?? 0}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0</span>
                        )}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-slate-300 text-xs whitespace-nowrap">
                        {formatDate(row.revisionDate ?? row.issueDate)}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-center text-slate-300 text-xs">
                        {row.revno ?? "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          row.department === "QHSE"
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                            : row.department === "Operations"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : row.department === "PMS"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                        }`}>
                          {row.department || "—"}
                        </span>
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {row.templatePath ? (
                          <a
                            href={row.templatePath}
                            download
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sky-300 hover:bg-sky-500/20 hover:text-white transition"
                            title={`Download template: ${row.title}`}
                            aria-label={`Download template for ${row.title}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
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
