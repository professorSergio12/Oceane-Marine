"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, ViewIconButton, EditIconButton, DownloadIconButton } from "../../../components/ActionIcons";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";

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

export default function MOCManagementChangeListPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const [mocs, setMocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedMoc, setSelectedMoc] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [mocToReject, setMocToReject] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  // Status filter: Draft, Open, Closed, All
  const [filter, setFilter] = useState("Open");
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };

  const fetchMocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (year !== "" && year != null) {
        params.append("year", String(year));
      }
      const url = `/api/qhse/moc/management-change/list${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load MOC forms");
      }
      setMocs(data.data || []);
      if (data.years && data.years.length > 0) {
        setAvailableYears(data.years);
      }
      if (selectedMoc) {
        const updated = (data.data || []).find(
          (m) => m._id === selectedMoc._id
        );
        if (updated) setSelectedMoc(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMocs();
  }, [year]);

  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/moc/management-change/list");
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

  const handleArchive = async (moc) => {
    if (!confirm("Archive this MOC form? It will be stored in QHSE Archive (MOC Management Change).")) return;
    setArchivingId(moc._id);
    setError(null);
    setActionMessage(null);
    if (selectedMoc?._id === moc._id) setSelectedMoc(null);
    try {
      const payload = buildArchivePayload(ARCHIVE_MODULES.MOC_MANAGEMENT_CHANGE, moc, moc.proposedChange || moc.formCode, moc.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setMocs((prev) => prev.filter((m) => m._id !== moc._id));
      setActionMessage("MOC form archived successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (mocId) => {
    if (
      !confirm(
        "Are you sure you want to delete this MOC form? This cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(mocId);
    setError(null);
    setActionMessage(null);
    if (selectedMoc?._id === mocId) {
      setSelectedMoc(null);
    }
    try {
      const res = await fetch(
        `/api/qhse/moc/management-change/${mocId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setMocs((prev) => prev.filter((m) => m._id !== mocId));
      setActionMessage("MOC form deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (mocId) => {
    if (
      !confirm(
        "Are you sure you want to submit this form? It cannot be edited after submission."
      )
    ) {
      return;
    }

    setSubmitting(mocId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/moc/management-change/${mocId}/submit`,
        {
          method: "PUT",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit form");
      }

      await fetchMocs();
      setSelectedMoc(null);
      alert("Form submitted successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleApprove = async (mocId) => {
    if (
      !confirm(
        "Are you sure you want to approve this MOC Management of Change form?"
      )
    ) {
      return;
    }

    setApproving(mocId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/moc/management-change/${mocId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedBy: "admin-user-id", // Replace with actual user ID from auth
            approvalComments: "",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve form");
      }

      await fetchMocs();
      setSelectedMoc(null);
      alert("MOC form approved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    setRejecting(mocToReject._id);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/moc/management-change/${mocToReject._id}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rejectionReason: rejectionReason,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reject form");
      }

      await fetchMocs();
      setSelectedMoc(null);
      setShowRejectModal(false);
      setRejectionReason("");
      setMocToReject(null);
      alert("MOC form rejected successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setRejecting(null);
    }
  };

  const openRejectModal = (moc) => {
    setMocToReject(moc);
    setShowRejectModal(true);
    setRejectionReason("");
  };

  const handleClose = async (mocId) => {
    if (!confirm("Close this MOC form? It will be marked as Closed.")) return;
    setClosingId(mocId);
    setError(null);
    setActionMessage(null);
    try {
      const res = await fetch(
        `/api/qhse/moc/management-change/${mocId}/close`,
        { method: "PUT" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close");
      const updated = { status: "Closed", statusReview: "Closed" };
      setMocs((prev) =>
        prev.map((m) => (m._id === mocId ? { ...m, ...updated } : m))
      );
      if (selectedMoc?._id === mocId) {
        setSelectedMoc((prev) => (prev ? { ...prev, ...updated } : null));
      }
      setActionMessage("MOC form closed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setClosingId(null);
    }
  };

  // Filter MOCs based on selected status filter
  const filteredMocs = mocs.filter((moc) => {
    if (filter === "Draft") return moc.status === "Draft";
    if (filter === "Open") return moc.status === "Open";
    if (filter === "Closed") return moc.status === "Closed";
    return true; // "All"
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredMocs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMocs = filteredMocs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewDetails = (moc) => {
    setSelectedMoc(moc);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownloadDocx = async (mocId) => {
    setDownloadingId(mocId);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/moc/management-change/${mocId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download document");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MOC-${mocId}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || "Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadFile = async (mocId) => {
    setDownloadingFileId(mocId);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/moc/management-change/${mocId}/download-file`);
      
      // Check if response is JSON (error) or binary (file)
      const contentType = res.headers.get("content-type") || "";
      
      if (!res.ok) {
        // Try to parse as JSON error
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error || data.message || `Failed to download file (${res.status})`;
        alert(errorMsg);
        setError(errorMsg);
        return;
      }

      // Check if it's a redirect response
      if (res.redirected || res.status === 307 || res.status === 308) {
        // For redirects, open in new window
        window.open(res.url, "_blank");
        return;
      }

      // Check if content type indicates it's a file (not JSON)
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const errorMsg = data.error || data.message || "No file available";
        alert(errorMsg);
        setError(errorMsg);
        return;
      }

      // It's a file - download it
      const blob = await res.blob();
      
      // Extract filename from Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      let fileName = `MOC-file-${mocId}`;
      
      if (contentDisposition) {
        // Try to extract filename from Content-Disposition header
        // Format: attachment; filename="file.pdf" or attachment; filename*=UTF-8''file.pdf
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/i) || 
                             contentDisposition.match(/filename="?([^";]+)"?/i);
        if (filenameMatch && filenameMatch[1]) {
          fileName = decodeURIComponent(filenameMatch[1]);
        }
      }
      
      console.log("[MOC File Download Frontend] Downloading file:", fileName, "Size:", blob.size, "Type:", blob.type);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (err) {
      const errorMsg = err.message || "Failed to download file";
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setDownloadingFileId(null);
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
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        <header className="mt-12 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / MOC / Management of Change
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Management of Change</h1>
            <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-058</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Year Filter */}
            {!selectedMoc && (
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
                  {availableYears.length === 0 ? (
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
            )}

            {/* Template (058) - Management of Change Form */}
            {!selectedMoc && (
              <a
                href="/templates/controlled-register/QAF-OFD-058.docx"
                download
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                title="Download form template (QAF-OFD-058)"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                </svg>
                Template (058)
              </a>
            )}
            {/* Template (058A) - MOC Risk Assessment */}
            {!selectedMoc && (
              <a
                href="/templates/controlled-register/QAF-OFD-058A.docx"
                download
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                title="Download form template (QAF-OFD-058A)"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                </svg>
                Template (058A)
              </a>
            )}

            {/* Top-right Form/List toggle */}
            {!selectedMoc && (
              <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <Link
                  href="/qhse/moc/management-change/form"
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  MOC Form
                </Link>
                <button
                  type="button"
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition cursor-default"
                >
                  MOC List
                </button>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-3 py-2">
            {actionMessage}
          </div>
        )}

        <main className="space-y-6">
          {/* Status Filter Tabs */}
          {!selectedMoc && (
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              {["Open", "Closed", "Draft", "All"].map((statusKey) => {
                const label = statusKey === "All" ? "All" : statusKey;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => {
                      setFilter(statusKey);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                      filter === statusKey
                        ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                        : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Detail Card - Takes full space when MOC is selected */}
          {selectedMoc && (
            <div className="w-full rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      MOC Details
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      FORM CODE:{" "}
                      <span className="font-mono text-sky-300">
                        {selectedMoc.formCode || "—"}
                      </span>
                    </p>
                    {selectedMoc.serialNumber && (
                      <p className="text-xs text-slate-400 mt-1">
                        SERIAL:{" "}
                        <span className="font-mono text-slate-200">
                          {selectedMoc.serialNumber}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border ${
                        selectedMoc.status === "Open"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                          : selectedMoc.status === "Closed"
                          ? "bg-red-500/20 text-red-300 border-red-400/50"
                          : "bg-amber-500/20 text-amber-300 border-amber-400/50"
                      }`}
                    >
                      {selectedMoc.status || "Draft"}
                    </span>
                    {selectedMoc.status === "Closed" &&
                      selectedMoc.statusReview && (
                        <span
                          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border ${
                            selectedMoc.statusReview === "Approved"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                              : selectedMoc.statusReview === "Rejected"
                              ? "bg-red-500/20 text-red-300 border-red-400/50"
                              : "bg-slate-500/20 text-slate-300 border-slate-400/50"
                          }`}
                        >
                          {selectedMoc.statusReview}
                        </span>
                      )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Only show file download button if files are attached */}
                  {selectedMoc.riskAssessmentFiles && selectedMoc.riskAssessmentFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(selectedMoc._id)}
                      disabled={downloadingFileId === selectedMoc._id}
                      className="px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 hover:border-purple-400/50 text-purple-300 hover:text-purple-200 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Download attached file"
                    >
                      {downloadingFileId === selectedMoc._id ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>File</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadDocx(selectedMoc._id)}
                    disabled={downloadingId === selectedMoc._id}
                    className="px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 hover:border-sky-400/50 text-sky-300 hover:text-sky-200 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download as Word"
                  >
                    {downloadingId === selectedMoc._id ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>DOCX</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMoc(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition text-white text-xl font-bold"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        Proposed Change
                      </p>
                      <p className="text-sm text-white">
                        {selectedMoc.proposedChange || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        Reason for Change
                      </p>
                      <p className="text-sm text-white">
                        {selectedMoc.reasonForChange || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        Proposed By
                      </p>
                      <p className="text-sm text-white">
                        {selectedMoc.proposedBy || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        MOC Initiated By
                      </p>
                      <p className="text-sm text-white">
                        {selectedMoc.mocInitiatedBy || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        Target Implementation Date
                      </p>
                      <p className="text-sm text-white">
                        {formatDate(selectedMoc.targetImplementationDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        Initiation Date
                      </p>
                      <p className="text-sm text-white">
                        {formatDate(selectedMoc.initiationDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Impact & Risk */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                    Impact & Risk Assessment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedMoc.potentialConsequences && (
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Potential Consequences
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedMoc.potentialConsequences)
                            .filter(
                              ([key, value]) => key !== "remarks" && value
                            )
                            .map(([key]) => (
                              <span
                                key={key}
                                className="inline-flex items-center rounded px-2 py-1 text-xs font-medium bg-sky-500/20 text-sky-300 border border-sky-400/50"
                              >
                                {key}
                              </span>
                            ))}
                        </div>
                        {selectedMoc.potentialConsequences.remarks && (
                          <p className="text-sm text-white mt-2">
                            {selectedMoc.potentialConsequences.remarks}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-400 block">
                        Risk Assessment Required
                      </p>
                      <p className="text-sm text-white">
                        {selectedMoc.riskAssessmentRequired ? "Yes" : "No"}
                      </p>
                    </div>
                    {selectedMoc.riskLevel && (
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Risk Level
                        </p>
                        <p className="text-sm text-white">
                          {selectedMoc.riskLevel}
                        </p>
                      </div>
                    )}
                    {selectedMoc.riskAssessmentRequired &&
                      Array.isArray(selectedMoc.riskAssessmentFiles) &&
                      selectedMoc.riskAssessmentFiles.length > 0 && (
                      <div className="space-y-1 md:col-span-2">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Risk assessment documents
                        </p>
                        <ul className="space-y-1">
                          {selectedMoc.riskAssessmentFiles.map((f, i) => (
                            <li key={i}>
                              <a
                                href={
                                  f.url
                                    ? `/api/qhse/file/${String(f.url).replace(/^\//, "")}`
                                    : "#"
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-sky-300 hover:text-sky-200"
                              >
                                {f.name || f.filename}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedMoc.equipmentFacilityDocumentationAffected && (
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Equipment/Facility/Documentation Affected
                        </p>
                        <p className="text-sm text-white">
                          {selectedMoc.equipmentFacilityDocumentationAffected}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Training & Document Control */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                      Training
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Training Required
                        </p>
                        <p className="text-sm text-white">
                          {selectedMoc.trainingRequired ? "Yes" : "No"}
                        </p>
                      </div>
                      {selectedMoc.trainingDetails && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-slate-400 block">
                            Training Details
                          </p>
                          <p className="text-sm text-white">
                            {selectedMoc.trainingDetails}
                          </p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Training Completed
                        </p>
                        <p className="text-sm text-white">
                          {selectedMoc.trainingCompleted ? "Yes" : "No"}
                        </p>
                      </div>
                      {selectedMoc.trainingCompletionDate && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-slate-400 block">
                            Training Completion Date
                          </p>
                          <p className="text-sm text-white">
                            {formatDate(selectedMoc.trainingCompletionDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                      Document Control
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Document Change Required
                        </p>
                        <p className="text-sm text-white">
                          {selectedMoc.documentChangeRequired ? "Yes" : "No"}
                        </p>
                      </div>
                      {selectedMoc.dcrNumber && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-slate-400 block">
                            DCR Number
                          </p>
                          <p className="text-sm text-white">
                            {selectedMoc.dcrNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Implementation Details */}
                {(selectedMoc.changeMadeBy ||
                  selectedMoc.changeDetails ||
                  selectedMoc.changeCompletionDate) && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                      Implementation Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMoc.changeMadeBy && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-slate-400 block">
                            Change Made By
                          </p>
                          <p className="text-sm text-white">
                            {selectedMoc.changeMadeBy?.name ||
                              selectedMoc.changeMadeBy ||
                              "—"}
                          </p>
                        </div>
                      )}
                      {selectedMoc.changeDetails && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-slate-400 block">
                            Change Details
                          </p>
                          <p className="text-sm text-white">
                            {selectedMoc.changeDetails}
                          </p>
                        </div>
                      )}
                      {selectedMoc.changeCompletionDate && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wider text-slate-400 block">
                            Change Completion Date
                          </p>
                          <p className="text-sm text-white">
                            {formatDate(selectedMoc.changeCompletionDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Closed Reason (if closed via rejection) */}
                {selectedMoc.status === "Closed" &&
                  selectedMoc.rejectionReason && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                        Closure Details
                      </h3>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wider text-slate-400 block">
                          Closure Reason
                        </p>
                        <p className="text-sm text-white">
                          {selectedMoc.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Action Buttons - Show different buttons based on status */}
                {selectedMoc.status === "Draft" && (
                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMoc(null);
                        router.push(
                          `/qhse/moc/management-change/form?edit=${selectedMoc._id}`
                        );
                      }}
                      className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white font-medium hover:bg-white/10 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmit(selectedMoc._id)}
                      disabled={submitting === selectedMoc._id}
                      className="px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting === selectedMoc._id
                        ? "Submitting..."
                        : "Submit"}
                    </button>
                  </div>
                )}

                {/* Approve/Reject/Close Buttons - Show for Open forms */}
                {selectedMoc.status === "Open" && (
                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => openRejectModal(selectedMoc)}
                      disabled={rejecting === selectedMoc._id}
                      className="px-4 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 font-medium hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rejecting === selectedMoc._id
                        ? "Rejecting..."
                        : "Reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedMoc._id)}
                      disabled={approving === selectedMoc._id}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving === selectedMoc._id
                        ? "Approving..."
                        : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClose(selectedMoc._id)}
                      disabled={closingId === selectedMoc._id}
                      className="px-4 py-2 rounded-lg border border-white/30 bg-white/5 text-white font-medium hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {closingId === selectedMoc._id
                        ? "Closing..."
                        : "Close"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table - Hidden when detail card is shown */}
          {!selectedMoc && (
            <>
              {filteredMocs.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
                    <p className="text-white/60 mb-4">
                      {year
                        ? `No forms found for ${year}${filter !== "All" ? ` (${filter})` : ""}`
                        : filter === "Draft"
                        ? "No draft forms found"
                        : filter === "Open"
                        ? "No open forms found"
                        : filter === "Closed"
                        ? "No closed forms found"
                        : "No forms found"}
                    </p>
                  {filter === "Draft" && (
                    <Link
                      href="/qhse/moc/management-change/form"
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 transition"
                    >
                      Create New Form
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Form Code
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Serial
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Proposed Change
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Initiation Date
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Decision
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/80">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {currentMocs.map((moc) => (
                            <tr
                              key={moc._id}
                              className="hover:bg-white/5 transition"
                            >
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-sky-300">
                                {moc.formCode || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-200">
                                {moc.serialNumber || "—"}
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-white line-clamp-2 max-w-md">
                                  {moc.proposedChange || "—"}
                                </p>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-white/80">
                                  {formatDate(moc.initiationDate)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ${
                                    moc.status === "Open"
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                                      : moc.status === "Closed"
                                      ? "bg-red-500/20 text-red-300 border-red-400/50"
                                      : "bg-amber-500/20 text-amber-300 border-amber-400/50"
                                  }`}
                                >
                                  {moc.status || "Draft"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {moc.status === "Closed" && moc.statusReview ? (
                                  <span
                                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider border ${
                                      moc.statusReview === "Approved"
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                                        : moc.statusReview === "Rejected"
                                        ? "bg-red-500/20 text-red-300 border-red-400/50"
                                        : "bg-slate-500/20 text-slate-300 border-slate-400/50"
                                    }`}
                                  >
                                    {moc.statusReview}
                                  </span>
                                ) : (
                                  <span className="text-xs text-white/60">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  <ViewIconButton
                                    onClick={() => handleViewDetails(moc)}
                                    title="View Details"
                                  />
                                  {/* Only show file download button if files are attached */}
                                  {moc.riskAssessmentFiles && moc.riskAssessmentFiles.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFile(moc._id)}
                                      disabled={downloadingFileId === moc._id}
                                      className="px-2 py-1 rounded border border-purple-400/30 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                      title="Download attached file"
                                    >
                                      {downloadingFileId === moc._id ? (
                                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                  <DownloadIconButton
                                    onClick={() => handleDownloadDocx(moc._id)}
                                    disabled={downloadingId === moc._id}
                                    loading={downloadingId === moc._id}
                                    title="Download as Word"
                                  />
                                  {moc.status === "Draft" && (
                                    <EditIconButton
                                      onClick={() => router.push(`/qhse/moc/management-change/form?edit=${moc._id}`)}
                                    />
                                  )}
                                  <ArchiveIconButton
                                    onClick={() => handleArchive(moc)}
                                    disabled={archivingId === moc._id || deletingId === moc._id}
                                    loading={archivingId === moc._id}
                                  />
                                  <DeleteIconButton
                                    onClick={() => handleDelete(moc._id)}
                                    disabled={archivingId === moc._id || deletingId === moc._id}
                                    loading={deletingId === moc._id}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-white/80">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/20 p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Reject MOC Form</h3>
            <div>
              <label
                htmlFor="rejectionReason"
                className="block text-sm font-medium text-white/90 mb-2"
              >
                Reason for Rejection <span className="text-red-400">*</span>
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setMocToReject(null);
                }}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white font-medium hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejecting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
