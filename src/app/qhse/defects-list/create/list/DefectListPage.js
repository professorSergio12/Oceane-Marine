"use client";

import { useQhseLoading } from "@/app/qhse/QhseLoadingContext";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { saveAs } from "file-saver";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, DownloadIconButton, EditIconButton } from "../../../components/ActionIcons";
import { QhseListPageContainer } from "../../../components/QhseListPageContainer";

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

export default function DefectListPage() {
  const { setPageLoading } = useQhseLoading();
  const { contentClassName } = useQhseSidebar();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [exportingPdfId, setExportingPdfId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/defects-list/list");
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

  const fetchDefects = async () => {
    setLoading(true);
    setPageLoading(true);
    setError(null);
    try {
      const url = year !== "" && year != null
        ? `/api/qhse/defects-list/list?year=${year}`
        : "/api/qhse/defects-list/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load defects list");
      }
      setDefects(data.equipmentDefects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [year]);

  const handleDownloadWord = async (defect) => {
    setExportingId(defect._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/defects-list/${defect._id}/docx`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition");
      const match = disp && disp.match(/filename="?([^";]+)"?/);
      const fileName = match ? match[1].trim() : `Defect-${defect.serialNumber || defect._id}.docx`;
      saveAs(blob, fileName);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingId(null);
    }
  };

  const handleDownloadPdf = async (defect) => {
    setExportingPdfId(defect._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/defects-list/${defect._id}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "PDF download failed");
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition");
      const match = disp && disp.match(/filename="?([^";]+)"?/);
      const fileName = match
        ? match[1].trim()
        : `Defect-${defect.serialNumber || defect._id}.pdf`;
      saveAs(blob, fileName);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setActionLoadingId(id);
    setActionMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/defects-list/${id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      setActionMessage("Status updated successfully.");
      await fetchDefects();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this defect? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/qhse/defects-list/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setDefects((prev) => prev.filter((d) => d._id !== id));
      setActionMessage("Defect deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchive = async (defect) => {
    if (!confirm("Archive this defect? It will be stored in QHSE Archive (Equipment Defects).")) return;
    setArchivingId(defect._id);
    setError(null);
    setActionMessage(null);
    try {
      const payload = buildArchivePayload(ARCHIVE_MODULES.EQUIPMENT_DEFECTS, defect, defect.equipmentDefect || defect.formCode, defect.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setDefects((prev) => prev.filter((d) => d._id !== defect._id));
      setActionMessage("Defect archived successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDownload = async (defectId, index, filename) => {
    setDownloading(defectId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/defects-list/${defectId}/download?index=${index}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `attachment-${index}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  const statusOptions = ["Open", "In Progress", "Closed"];

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
              QHSE / Defects List
            </p>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Equipment Defects List</h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-025</span>
              {" – "}
              Equipment Defect list
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 self-end sm:self-auto flex-wrap">
            <a
              href="/templates/controlled-register/QAF-OFD-025.xlsx"
              download
              className="inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
              title="Download form template (QAF-OFD-025)"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
              </svg>
              Template
            </a>
            <div className="inline-flex rounded-lg sm:rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/defects-list/create/plan"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Create Defect
              </Link>
              <Link
                href="/qhse/defects-list/create/list"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Defect List
              </Link>
            </div>
          </div>
        </header>

        <QhseListPageContainer
          searchPlaceholder="Search by serial, form code, defect, base..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filterChildren={
            <>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
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
                    <option key={y} value={y}>{y}</option>
                  ))
                )}
              </select>
            </>
          }
        >
          {error && (
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {actionMessage && (
            <p className="text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-3 py-2">
              {actionMessage}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-slate-100">Loading defects…</p>
          ) : (() => {
            const searchFiltered = !searchTerm.trim()
              ? defects
              : defects.filter((d) => {
                  const s = searchTerm.toLowerCase();
                  return (d.serialNumber || "").toLowerCase().includes(s)
                    || (d.formCode || "").toLowerCase().includes(s)
                    || (d.equipmentDefect || "").toLowerCase().includes(s)
                    || (d.base || "").toLowerCase().includes(s);
                });
            return searchFiltered.length === 0 ? (
              <p className="text-sm text-slate-100">
                {searchTerm.trim() ? "No defects match your search." : (year !== "" && year != null ? `No equipment defects found for ${year}.` : "No equipment defects found.")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-200 border-b border-white/10">
                      <th className="py-2 pr-4">Form Code</th>
                      <th className="py-2 pr-4">Serial</th>
                      <th className="py-2 pr-4">Equipment Defect</th>
                      <th className="py-2 pr-4">Base</th>
                      <th className="py-2 pr-4">Target Date</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Completion Date</th>
                      <th className="py-2 pr-4">Photos / Files</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchFiltered.map((defect) => (
                      <tr
                        key={defect._id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="py-2 pr-4 font-mono text-sky-300">
                          {defect.formCode || "QAF-OFD-025"}
                        </td>
                        <td className="py-2 pr-4 font-mono text-slate-200">
                          {defect.serialNumber || "—"}
                        </td>
                        <td className="py-2 pr-4 max-w-xs">
                          <p className="line-clamp-2">
                            {defect.equipmentDefect}
                          </p>
                        </td>
                        <td className="py-2 pr-4">{defect.base}</td>
                        <td className="py-2 pr-4">
                          {formatDate(defect.targetDate)}
                        </td>
                        <td className="py-2 pr-4">
                          <select
                            value={defect.status || "Open"}
                            onChange={(e) => handleStatusChange(defect._id, e.target.value)}
                            disabled={actionLoadingId === defect._id}
                            className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-4">
                          {formatDate(defect.completionDate)}
                        </td>
                        <td className="py-2 pr-4">
                          {defect.attachments?.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {defect.attachments.map((att, idx) => (
                                <DownloadIconButton
                                  key={idx}
                                  onClick={() => handleDownload(defect._id, idx, att.originalName)}
                                  disabled={downloading === defect._id}
                                  loading={downloading === defect._id}
                                  title="Download attached file"
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <DownloadIconButton
                              onClick={() => handleDownloadWord(defect)}
                              disabled={
                                archivingId === defect._id ||
                                deletingId === defect._id ||
                                exportingPdfId === defect._id
                              }
                              loading={exportingId === defect._id}
                              title="Download as Word"
                            />
                            <DownloadIconButton
                              onClick={() => handleDownloadPdf(defect)}
                              disabled={
                                archivingId === defect._id ||
                                deletingId === defect._id ||
                                exportingId === defect._id
                              }
                              loading={exportingPdfId === defect._id}
                              title="Download as PDF"
                              className="!text-rose-400 hover:!text-rose-300"
                            />
                            <EditIconButton href={`/qhse/defects-list/create?edit=${defect._id}`} />
                            <ArchiveIconButton
                              onClick={() => handleArchive(defect)}
                              disabled={archivingId === defect._id || deletingId === defect._id}
                              loading={archivingId === defect._id}
                            />
                            <DeleteIconButton
                              onClick={() => handleDelete(defect._id)}
                              disabled={archivingId === defect._id || deletingId === defect._id}
                              loading={deletingId === defect._id}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </QhseListPageContainer>
      </div>
    </div>
  );
}

