"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, ViewIconButton, DownloadIconButton } from "../../../components/ActionIcons";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";
import { QhseListPageContainer } from "../../../components/QhseListPageContainer";
import Link from "next/link";

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

export default function PoacCrossCompetencyListPage() {
  const { contentClassName } = useQhseSidebar();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [downloadingDocxId, setDownloadingDocxId] = useState(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        latestOnly: "true",
      });

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (year !== "" && year != null) {
        params.append("year", year.toString());
      }

      const res = await fetch(
        `/api/qhse/cross-competency/list?${params.toString()}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load forms");
      }

      setForms(data.data || []);
      setTotalFromApi(data.total ?? 0);
      setTotalPagesFromApi(data.totalPages ?? 1);
      if (data.years && data.years.length > 0) {
        setAvailableYears(data.years);
      }
    } catch (err) {
      setError(err.message || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [currentPage, statusFilter, year]);

  const handleArchive = async (form) => {
    if (!confirm("Archive this form? It will be stored in QHSE Archive (POAC Cross Competency).")) return;
    setArchivingId(form._id);
    setError(null);
    setActionMessage(null);
    try {
      const payload = buildArchivePayload(ARCHIVE_MODULES.POAC_CROSS_COMPETENCY, form, form.nameOfPOAC || form.formCode, form.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setForms((prev) => prev.filter((f) => f._id !== form._id));
      setActionMessage("Form archived successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (form) => {
    if (!confirm("Are you sure you want to delete this form? This cannot be undone.")) return;
    setDeleting(form._id);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/qhse/cross-competency/${form._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setForms((prev) => prev.filter((f) => f._id !== form._id));
      setActionMessage("Form deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadDocx = async (form) => {
    setDownloadingDocxId(form._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/cross-competency/${form._id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download");
      }
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let fileName = `POAC-Cross-Competency-${form.serialNumber || form._id}.docx`;
      const contentDisposition = res.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^";]+)/i) || contentDisposition.match(/filename="?([^"]+)"?/i);
        if (match && match[1]) {
          fileName = match[1].trim().replace(/"$/g, "");
        }
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download");
    } finally {
      setDownloadingDocxId(null);
    }
  };

  const handleDownloadPdf = async (form) => {
    setDownloadingPdfId(form._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/cross-competency/${form._id}/download/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download PDF");
      }
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let fileName = `POAC-Cross-Competency-${form.serialNumber || form._id}.pdf`;
      const contentDisposition = res.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^";]+)/i) || contentDisposition.match(/filename="?([^"]+)"?/i);
        if (match && match[1]) {
          fileName = match[1].trim().replace(/"$/g, "");
        }
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/cross-competency/list?limit=1");
        const data = await res.json();
        if (res.ok && data.years) {
          setAvailableYears(data.years);
        } else {
          setAvailableYears(getYears());
        }
      } catch (err) {
        setAvailableYears(getYears());
      } finally {
        setLoadingYears(false);
      }
    };
    fetchYears();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchForms();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Draft: "bg-slate-500/15 text-slate-300 border-slate-400/40",
      Submitted: "bg-blue-500/15 text-blue-300 border-blue-400/40",
      Reviewed: "bg-purple-500/15 text-purple-300 border-purple-400/40",
      Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
      Rejected: "bg-red-500/15 text-red-300 border-red-400/40",
    };

    const className = statusConfig[status] || statusConfig.Draft;

    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] border ${className}`}
      >
        {status}
      </span>
    );
  };

  const totalPages = totalPagesFromApi;

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
              QHSE / POAC Cross Competency
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              POAC Cross Competency Forms
            </h1>
            <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-009</span>
            </p>
          </div>
          <TemplateDownloadLink formCode="QAF-OFD-009" />
        </header>

        <main>
          <QhseListPageContainer
            searchPlaceholder="Search by Form Code, Job Ref No, or POAC Name..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filterChildren={
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
                  <select
                    className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
                    value={year === null || year === undefined ? "" : year}
                    onChange={(e) => {
                      const v = e.target.value;
                      setYear(v === "" ? "" : Number(v));
                      setCurrentPage(1);
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
                <select
                  className="rounded-xl bg-slate-900/40 border border-white/15 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </>
            }
          >
            {error && (
              <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            {actionMessage && (
              <div className="text-sm text-emerald-200 bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-4 py-3">
                {actionMessage}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-slate-300">Loading forms...</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-slate-300 mb-2">
                  {year !== "" && year != null
                    ? `No forms found for ${year}${searchTerm || statusFilter !== "all" ? " matching your criteria" : ""}`
                    : searchTerm || statusFilter !== "all"
                    ? "No forms found matching your criteria."
                    : "No POAC Cross Competency forms found."}
                </p>
                <p className="text-xs text-slate-400">
                  Forms are submitted via the external QHSE Forms app.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-200 border-b border-white/10">
                        <th className="py-3 pr-4 font-semibold">Form Code</th>
                        <th className="py-3 pr-4 font-semibold">Serial</th>
                        <th className="py-3 pr-4 font-semibold">POAC Name</th>
                        <th className="py-3 pr-4 font-semibold">
                          Job Ref No
                        </th>
                        <th className="py-3 pr-4 font-semibold">Lead POAC</th>
                        <th className="py-3 pr-4 font-semibold">Version</th>
                        <th className="py-3 pr-4 font-semibold">Status</th>
                        <th className="py-3 pr-4 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((form) => (
                        <tr
                          key={form._id}
                          className="border-b border-white/5 hover:bg-white/5 transition"
                        >
                          <td className="py-3 pr-4">
                            <span className="font-mono text-sky-300">
                              {form.formCode || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-mono text-slate-200">
                              {form.serialNumber || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-slate-200">
                              {form.nameOfPOAC || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-slate-200">
                              {form.jobRefNo || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-slate-200">
                              {form.leadPOAC || "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-slate-300 font-mono text-[10px]">
                              v{form.revNo || "1.0"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {getStatusBadge(form.status || "Draft")}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <DownloadIconButton
                                onClick={() => handleDownloadDocx(form)}
                                disabled={
                                  downloadingDocxId === form._id ||
                                  downloadingPdfId === form._id ||
                                  archivingId === form._id ||
                                  deleting === form._id
                                }
                                loading={downloadingDocxId === form._id}
                                title="Download as Word"
                              />
                              <DownloadIconButton
                                onClick={() => handleDownloadPdf(form)}
                                disabled={
                                  downloadingPdfId === form._id ||
                                  downloadingDocxId === form._id ||
                                  archivingId === form._id ||
                                  deleting === form._id
                                }
                                loading={downloadingPdfId === form._id}
                                title="Download as PDF"
                                className="!text-rose-400 hover:!text-rose-300"
                              />
                              <ViewIconButton href={`/qhse/poac/cross-competency/${form._id}`} />
                              <ArchiveIconButton
                                onClick={() => handleArchive(form)}
                                disabled={archivingId === form._id || deleting === form._id}
                                loading={archivingId === form._id}
                              />
                              <DeleteIconButton
                                onClick={() => handleDelete(form)}
                                disabled={archivingId === form._id || deleting === form._id}
                                loading={deleting === form._id}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-300">
                      Showing page {currentPage} of {totalPages}
                      {totalFromApi > 0 && ` (${totalFromApi} total)`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </QhseListPageContainer>
        </main>
      </div>
    </div>
  );
}


