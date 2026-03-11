"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useHrLoading } from "../../HrLoadingContext";

/* ── Shared icon button components ── */
const tooltipClass =
  "pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-slate-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap";
const iconClass = "w-5 h-5";

function ViewIconButton({ onClick, title = "View" }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-1.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 transition inline-flex"
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      <span className={tooltipClass}>{title}</span>
    </span>
  );
}

function EditIconButton({ onClick, title = "Edit" }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-1.5 rounded text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition inline-flex"
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <span className={tooltipClass}>{title}</span>
    </span>
  );
}

function DeleteIconButton({ onClick, disabled, loading }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Delete"
        aria-label="Delete"
        className="p-1.5 rounded text-red-300 hover:text-red-200 hover:bg-red-500/10 disabled:opacity-50 transition inline-flex"
      >
        {loading ? (
          <svg className={`${iconClass} animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
      <span className={tooltipClass}>Delete</span>
    </span>
  );
}

function DownloadIconButton({ onClick, title = "Download" }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-1.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition inline-flex"
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      <span className={tooltipClass}>{title}</span>
    </span>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const colors = {
    Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "Counterparty STS service provider":
      "bg-blue-500/15 text-blue-300 border-blue-500/30",
    "In Progress": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        colors[status] || "bg-slate-500/15 text-slate-300 border-slate-500/30"
      }`}
    >
      {status}
    </span>
  );
}

/* ── PDF Generator (client-side) ── */
async function generatePDF(latestRecords) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header: Logo ──
  let logoEndY = 10;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = "/image/image.png";
    });
    const logoWidth = 40;
    const logoHeight = (img.naturalHeight / img.naturalWidth) * logoWidth;
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(img, "PNG", logoX, 8, logoWidth, logoHeight);
    logoEndY = 8 + logoHeight + 6;
  } catch {
    // If logo fails, just skip it
    logoEndY = 15;
  }

  // ── Title block ──
  const titleY = logoEndY;

  // Dark blue title background
  doc.setFillColor(0, 51, 102);
  doc.rect(20, titleY, pageWidth - 40, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Oceane group of companies", pageWidth / 2, titleY + 7, {
    align: "center",
  });

  // Subtitle
  doc.setFillColor(0, 51, 102);
  doc.rect(20, titleY + 10, pageWidth - 40, 10, "F");
  doc.setFontSize(10);
  doc.text("Approval list of Oil Majors/Traders", pageWidth / 2, titleY + 17, {
    align: "center",
  });

  // ── Table (using standalone autoTable function) ──
  const tableStartY = titleY + 24;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 20, right: 20 },
    head: [["List of Companies", "Status"]],
    body: latestRecords.map((r) => [r.companyName, r.status]),
    headStyles: {
      fillColor: [230, 126, 34],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80 },
      1: { cellWidth: "auto" },
    },
    theme: "grid",
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
  });

  // ── Footer ──
  const footerY = pageHeight - 20;

  // Orange accent line
  doc.setDrawColor(230, 126, 34);
  doc.setLineWidth(1.5);
  doc.line(20, footerY - 5, 40, footerY - 5);

  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text(
    "+971 50 497 4021   |   1201, Fortune Tower, Cluster C, JLT Dubai   |   operations@oceanemarine.com",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text("Dubai | Fujairah | Oman", 20, footerY + 4);

  // Save
  doc.save("Oil_Majors_Approval_List.pdf");
}

/* ── Main list component ── */
export default function OilMajorsListPage({ onRefresh }) {
  const router = useRouter();
  const { setPageLoading } = useHrLoading();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Filters
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Unique values for filters
  const companies = [...new Set(records.map((r) => r.companyName))].sort();
  const statuses = [
    ...new Set(records.map((r) => r.status)),
  ].sort();

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    let filtered = records;
    if (filterCompany)
      filtered = filtered.filter((r) => r.companyName === filterCompany);
    if (filterStatus)
      filtered = filtered.filter((r) => r.status === filterStatus);
    setFilteredRecords(filtered);
  }, [records, filterCompany, filterStatus]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setPageLoading(true);
      setError("");
      const res = await fetch("/api/hr/oil-majors/list");
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || "Failed to fetch records");
      setRecords(data.data || []);
      setFilteredRecords(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const handleView = (record) => setSelectedItem(record);
  const closeModal = () => setSelectedItem(null);

  const handleEdit = (record) => {
    router.push(`/hr/oil-majors?tab=form&edit=${record._id}`);
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this record? This action cannot be undone."
      )
    )
      return;
    try {
      setDeletingId(id);
      setError("");
      setActionMessage("");
      const res = await fetch(`/api/hr/oil-majors/${id}/delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || "Failed to delete");
      setActionMessage("Oil Major record deleted successfully.");
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadFile = (record) => {
    if (record.attachment?.fileUrl) {
      const a = document.createElement("a");
      a.href = record.attachment.fileUrl;
      a.download = record.attachment.originalFileName || "download";
      a.click();
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    try {
      setDownloadingPdf(true);
      // Fetch the latest status per company from the API
      const res = await fetch("/api/hr/oil-majors/latest");
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch latest records");
      await generatePDF(data.data || []);
    } catch (err) {
      setError(err.message || "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Filters Row + Download Button */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Company
            </span>
            <select
              className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Status
            </span>
            <select
              className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {(filterCompany || filterStatus) && (
            <button
              onClick={() => {
                setFilterCompany("");
                setFilterStatus("");
              }}
              className="text-xs text-slate-400 hover:text-white transition underline underline-offset-2"
            >
              Clear filters
            </button>
          )}

          {/* Download PDF button — right side */}
          <div className="ml-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingPdf ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"
                    />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
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

        {/* Table */}
        <main>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
              <p className="text-white/60 mb-2">
                {records.length === 0
                  ? "No Oil Major records found"
                  : "No records match the selected filters"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 font-semibold w-[5%]">S.No</th>
                      <th className="px-6 py-4 font-semibold w-[30%]">
                        Company Name
                      </th>
                      <th className="px-6 py-4 font-semibold w-[25%]">
                        Status
                      </th>
                      <th className="px-6 py-4 font-semibold w-[15%]">File</th>
                      <th className="px-6 py-4 font-semibold text-right w-[25%]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, idx) => (
                      <tr
                        key={record._id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-6 py-4 text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          {record.companyName}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-6 py-4">
                          {record.attachment?.fileUrl ? (
                            <DownloadIconButton
                              onClick={() => handleDownloadFile(record)}
                              title="Download File"
                            />
                          ) : (
                            <span className="text-white/30 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ViewIconButton
                              onClick={() => handleView(record)}
                            />
                            <EditIconButton
                              onClick={() => handleEdit(record)}
                            />
                            <DeleteIconButton
                              onClick={() => handleDelete(record._id)}
                              disabled={deletingId === record._id}
                              loading={deletingId === record._id}
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

      {/* View Modal */}
      {selectedItem &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              className="relative bg-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-6 py-5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  Oil Major Details
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">
                      Company Name
                    </label>
                    <p className="text-white font-medium">
                      {selectedItem.companyName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">
                      Status
                    </label>
                    <div className="mt-1">
                      <StatusBadge status={selectedItem.status} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">
                      Created At
                    </label>
                    <p className="text-white font-medium">
                      {selectedItem.createdAt
                        ? new Date(selectedItem.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* File */}
                {selectedItem.attachment?.fileUrl && (
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">
                      Attachment
                    </label>
                    <div className="flex items-center gap-3 mt-1">
                      <a
                        href={selectedItem.attachment.fileUrl}
                        download={
                          selectedItem.attachment.originalFileName || "download"
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        {selectedItem.attachment.originalFileName || "Download"}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
