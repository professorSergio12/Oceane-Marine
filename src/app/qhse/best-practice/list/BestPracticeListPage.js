"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { saveAs } from "file-saver";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../utils/archive";
import { useQhseSidebar } from "../../QhseSidebarContext";
import { ArchiveIconButton, DeleteIconButton, DownloadIconButton } from "../../components/ActionIcons";

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

// Generate dynamic years
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function BestPracticeListPage() {
  const { contentClassName } = useQhseSidebar();
  const initialYears = getYears();
  
  const [bestPractices, setBestPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/best-practice/list");
        const data = await res.json();
        if (res.ok && Array.isArray(data.years)) {
          const merged = Array.from(
            new Set([...initialYears, ...data.years])
          ).sort((a, b) => b - a);
          setAvailableYears(merged);
        }
      } finally {
        setLoadingYears(false);
      }
    };
    loadYears();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = year !== "" && year != null
        ? `/api/qhse/best-practice/list?year=${year}`
        : "/api/qhse/best-practice/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setBestPractices(data.bestPractices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const handleArchive = async (practice) => {
    if (!confirm("Archive this entry? It will be stored in QHSE Archive (Best Practice).")) return;
    setArchivingId(practice._id);
    setError(null);
    setActionMessage(null);
    try {
      const payload = buildArchivePayload(ARCHIVE_MODULES.BEST_PRACTICE, practice, practice.description || practice.formCode, practice.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setBestPractices((prev) => prev.filter((p) => p._id !== practice._id));
      setActionMessage("Best practice archived successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDownload = async (practice) => {
    setDownloadingId(practice._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/best-practice/${practice._id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition");
      const match = disp && disp.match(/filename="?([^";]+)"?/);
      const fileName = match ? match[1].trim() : `Best-Practice-${practice.serialNumber || practice._id}.docx`;
      saveAs(blob, fileName);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this best practice entry? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/qhse/best-practice/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setBestPractices((prev) => prev.filter((p) => p._id !== id));
      setActionMessage("Best practice deleted successfully.");
    } catch (err) {
      setError(err.message);
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
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              QHSE / Best Practices
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Best Practices List</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                Year
              </span>
              <select
                className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
                value={year === null || year === undefined ? "" : year}
                onChange={(e) => {
                  const v = e.target.value;
                  setYear(v === "" ? "" : Number(v));
                }}
                disabled={loadingYears}
              >
                <option value="">All years</option>
                {loadingYears ? (
                  <option disabled>Loading…</option>
                ) : (
                  availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/best-practice/create"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Create Best Practice
              </Link>
              <Link
                href="/qhse/best-practice/list"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Best Practice List
              </Link>
            </div>
          </div>
        </header>

        <main>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            {error && (
              <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}
            {actionMessage && (
              <p className="text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-3 py-2 mb-4">
                {actionMessage}
              </p>
            )}

            {loading ? (
              <p className="text-sm text-slate-100">Loading...</p>
            ) : bestPractices.length === 0 ? (
              <p className="text-sm text-slate-100">
                {year !== "" && year != null ? `No records found for ${year}.` : "No records found."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-200 border-b border-white/10">
                      <th className="py-3 pr-4 font-semibold">Form Code</th>
                      <th className="py-3 pr-4 font-semibold">Serial</th>
                      <th className="py-3 pr-4 font-semibold">Event Date</th>
                      <th className="py-3 pr-4 font-semibold">Description</th>
                      <th className="py-3 pr-4 font-semibold">Created At</th>
                      <th className="py-3 pr-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestPractices.map((practice) => (
                      <tr
                        key={practice._id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="py-3 pr-4 font-mono text-sky-300">
                          {practice.formCode || "—"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-slate-200">
                          {practice.serialNumber || "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {formatDate(practice.eventDate)}
                        </td>
                        <td className="py-3 pr-4 max-w-2xl">
                          <p className="text-slate-200">
                            {practice.description || "—"}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          {formatDate(practice.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <DownloadIconButton
                              onClick={() => handleDownload(practice)}
                              disabled={archivingId === practice._id || deletingId === practice._id}
                              loading={downloadingId === practice._id}
                            />
                            <ArchiveIconButton
                              onClick={() => handleArchive(practice)}
                              disabled={archivingId === practice._id || deletingId === practice._id}
                              loading={archivingId === practice._id}
                            />
                            <DeleteIconButton
                              onClick={() => handleDelete(practice._id)}
                              disabled={archivingId === practice._id || deletingId === practice._id}
                              loading={deletingId === practice._id}
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
        </main>
      </div>
    </div>
  );
}

