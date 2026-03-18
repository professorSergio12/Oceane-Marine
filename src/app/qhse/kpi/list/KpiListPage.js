"use client";

import { useQhseSidebar } from "../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TemplateDownloadLink } from "../../components/TemplateDownloadLink";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, DownloadIconButton } from "../../components/ActionIcons";

export default function KpiListPage() {
  const { contentClassName } = useQhseSidebar();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(""); // "" = All years
  const [archivingId, setArchivingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const url = year ? `/api/qhse/kpi/list?year=${year}` : "/api/qhse/kpi/list";
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load files");
        setItems(data.data || []);
        if (Array.isArray(data.years)) setYears(data.years);
      } catch (err) {
        setError(err.message || "Failed to load files");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year]);

  const handleArchive = async (item) => {
    if (!confirm("Archive this KPI file? It will be stored in QHSE Archive (KPI).")) return;
    setArchivingId(item._id);
    setError("");
    setActionMessage("");
    try {
      const payload = buildArchivePayload(
        ARCHIVE_MODULES.KPI_UPLOAD,
        item,
        item.originalName || item.formCode || "KPI upload",
        item.formCode || "HSE-001B"
      );
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setActionMessage("KPI file archived successfully.");
    } catch (err) {
      setError(err.message || "Failed to archive");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.originalName || item.serialNumber}"? This cannot be undone.`)) return;
    setDeletingId(item._id);
    setError("");
    setActionMessage("");
    try {
      const res = await fetch(`/api/qhse/kpi/${item._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setActionMessage("KPI file deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        <header className="mt-12 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / KPI
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">HSE Objectives & Targets</h1>
            <p className="text-sm text-slate-200 mt-1">Form code: <span className="font-mono font-semibold text-sky-300">HSE-001B</span></p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <TemplateDownloadLink formCode="HSE-001B" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                  Year
                </span>
                <select
                  className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option value="">All years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/kpi/target-kpi/form"
                className="flex-1 min-w-0 text-center px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Target KPI
              </Link>
              <Link
                href="/qhse/kpi/create"
                className="flex-1 min-w-0 text-center px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                KPI
              </Link>
            </div>
            </div>
            <div className="flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/kpi/create"
                className="flex-1 min-w-0 text-center px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Form
              </Link>
              <Link
                href="/qhse/kpi/list"
                className="flex-1 min-w-0 text-center px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                List
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-200 text-sm font-medium">
            {actionMessage}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-300">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-300">No uploads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-200">
                <thead className="text-xs uppercase tracking-wide text-slate-300 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Form code</th>
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3">File name</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-sky-300">
                        {item.formCode || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {item.serialNumber || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {item.originalName || item.filename || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 inline-flex">
                          <DownloadIconButton href={`/api/qhse/kpi/${item._id}/download`} title="Download as Word" />
                          <ArchiveIconButton
                            onClick={() => handleArchive(item)}
                            disabled={archivingId === item._id || deletingId === item._id}
                            loading={archivingId === item._id}
                          />
                          <DeleteIconButton
                            onClick={() => handleDelete(item)}
                            disabled={archivingId === item._id || deletingId === item._id}
                            loading={deletingId === item._id}
                          />
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
