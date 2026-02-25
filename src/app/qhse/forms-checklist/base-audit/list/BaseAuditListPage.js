"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, DownloadIconButton, EditIconButton } from "../../../components/ActionIcons";

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

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default function BaseAuditListPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/master/locations/list");
        const data = await res.json();
        if (res.ok && data.locations) {
          setLocations(data.locations);
        }
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/form-checklist/base-audit/list");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.years)) {
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

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year !== "" && year != null) params.set("year", year);
      if (locationId) params.set("locationId", locationId);
      const url = params.toString()
        ? `/api/qhse/form-checklist/base-audit/list?${params}`
        : "/api/qhse/form-checklist/base-audit/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load reports");
      }
      setReports(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [year, locationId]);

  const handleDownload = async (report) => {
    setDownloading(report._id);
    try {
      // Create download link from file path
      const filePath = report.filePath;
      const fileName =
        filePath.split("/").pop() || `base-audit-v${report.version}.pdf`;

      // Fetch file from server
      const res = await fetch(
        `/api/qhse/form-checklist/base-audit/${report._id}/download`
      );

      if (!res.ok) {
        throw new Error("Failed to download file");
      }

      // Get blob and create download
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  const handleEdit = (report) => {
    router.push(`/qhse/forms-checklist/base-audit/form?edit=${report._id}`);
  };

  const handleArchive = async (report) => {
    if (!confirm("Archive this report? It will be stored in QHSE Archive (Base Audit).")) return;
    setArchivingId(report._id);
    setError(null);
    try {
      const payload = buildArchivePayload(ARCHIVE_MODULES.BASE_AUDIT, report, report.description || report.formCode, report.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setReports((prev) => prev.filter((r) => r._id !== report._id));
    } catch (err) {
      setError(err.message || "Failed to archive");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (report) => {
    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
    setDeleting(report._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/form-checklist/base-audit/${report._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setReports((prev) => prev.filter((r) => r._id !== report._id));
    } catch (err) {
      setError(err.message || "Failed to delete report");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className={`${contentClassName} flex items-center justify-center`}>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / Forms & Checklist / Base Audit
            </p>
            <h1 className="text-2xl font-bold text-white">Base Audit Reports</h1>
              <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-004</span>
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
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
                    <option key={y} value={y}>{y}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                Location
              </span>
              <select
                className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
                value={locationId || ""}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={loadingLocations}
              >
                <option value="">All</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <a
              href="/templates/controlled-register/QAF-OFD-004.docx"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
              title="Download form template (QAF-OFD-004)"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
              </svg>
              Template
            </a>
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/forms-checklist/base-audit/form"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Base Audit Form
              </Link>
              <Link
                href="/qhse/forms-checklist/base-audit/list"
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Base Audit List
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        <main>
          {reports.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20 border border-sky-500/50">
                  <svg
                    className="h-8 w-8 text-sky-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-white/60 mb-2">
                {year !== "" && year != null ? `No reports found for ${year}` : "No reports found"}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {year !== "" && year != null
                  ? "Try selecting a different year or upload a new report"
                  : "Start by uploading your first base audit report"}
              </p>
              <Link
                href="/qhse/forms-checklist/base-audit/form"
                className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Upload Report
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 font-semibold">Form Code</th>
                      <th className="px-6 py-4 font-semibold">Serial</th>
                      <th className="px-6 py-4 font-semibold">Location</th>
                      <th className="px-6 py-4 font-semibold">Version</th>
                      <th className="px-6 py-4 font-semibold">Uploaded By</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr
                        key={report._id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sky-300">
                            {report.formCode || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-slate-200">
                            {report.serialNumber || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-200">
                            {report.location?.name || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sky-300">
                            v{report.version || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-200">
                            {report.uploadedBy?.name || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">{formatDate(report.date)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <DownloadIconButton
                              onClick={() => handleDownload(report)}
                              disabled={downloading === report._id}
                              loading={downloading === report._id}
                            />
                            <ArchiveIconButton
                              onClick={() => handleArchive(report)}
                              disabled={archivingId === report._id || deleting === report._id}
                              loading={archivingId === report._id}
                            />
                            <EditIconButton onClick={() => handleEdit(report)} />
                            <DeleteIconButton
                              onClick={() => handleDelete(report)}
                              disabled={archivingId === report._id || deleting === report._id}
                              loading={deleting === report._id}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
