"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useHrLoading } from "../../HrLoadingContext";

/* ── Shared icon button components (matching QHSE style) ── */
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

function DownloadIconButton({ onClick, disabled, loading }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Download"
        aria-label="Download"
        className="p-1.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 disabled:opacity-50 transition inline-flex"
      >
        {loading ? (
          <svg className={`${iconClass} animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </button>
      <span className={tooltipClass}>Download</span>
    </span>
  );
}

/* ── PDF Generator (client-side, landscape) ── */
async function generatePoacMatrixPDF(allRows, providerName, recordYear) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("l", "mm", "a4"); // landscape
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const displayYear = recordYear || new Date().getFullYear();
  const safeProvider = providerName || "POAC";
  const margin = 6;
  const headerHeight = 28;

  // ── Header banner (bordered box with logo + title) ──
  // Dark blue background fill for the header area
  doc.setFillColor(0, 51, 102);
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.6);
  doc.rect(margin, 4, pageWidth - margin * 2, headerHeight, "FD"); // F = fill, D = draw border

  // Vertical divider between logo and title (white line)
  const logoDividerX = 55;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(logoDividerX, 4, logoDividerX, 4 + headerHeight);

  // Logo in left box
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = "/image/image.png";
    });
    const logoWidth = 38;
    const logoHeight = (img.naturalHeight / img.naturalWidth) * logoWidth;
    const logoX = margin + (logoDividerX - margin - logoWidth) / 2;
    const logoY = 4 + (headerHeight - logoHeight) / 2;
    doc.addImage(img, "PNG", logoX, logoY, logoWidth, logoHeight);
  } catch {
    // no logo fallback
  }

  // Title in right box (white text on dark blue background)
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255); // White text
  const titleCenterX = logoDividerX + (pageWidth - margin - logoDividerX) / 2;
  doc.text(`POAC Matrix - ${displayYear}`, titleCenterX, 4 + headerHeight / 2 + 3, { align: "center" });

  // ── Table columns ──
  const pdfColumns = [
    "S.N",
    "STS Service\nProvider",
    "POAC's Name",
    "Valid\nPassport",
    "Valid\nMaster's\nCOC",
    "Dangerous\ncargo\nendorsement\n(Oil)",
    "Dangerous\ncargo\nendorsement(Ch\nem)",
    "Dangerous\ncargo\nendorsements\n(Gas)",
    "Oil spill\nresponse\ntraining",
    "STS\nSimulator\ntraining",
    "Vessel\nSize\nLimitation",
    "Underway\noperations",
    "Valid\nMedicals",
    "Experience\nwith Oceane",
    "Remarks:\nLocations / etc",
  ];

  const pdfKeys = [
    "stsServiceProvider",
    "poacName",
    "validPassport",
    "validMastersCOC",
    "dangerousCargoEndorsementOil",
    "dangerousCargoEndorsementChem",
    "dangerousCargoEndorsementGas",
    "oilSpillResponseTraining",
    "stsSimulatorTraining",
    "vesselSizeLimitations",
    "underwayOperations",
    "validMedicals",
    "experienceWithOceane",
    "remarks",
  ];

  // Build body rows (serial numbered)
  const body = allRows.map((row, idx) => [
    idx + 1,
    ...pdfKeys.map((k) => row[k] || "—"),
  ]);

  const tableStartY = 4 + headerHeight + 2;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [pdfColumns],
    body,
    headStyles: {
      fillColor: [230, 126, 34],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6,
      cellPadding: 2,
      halign: "center",
      valign: "middle",
      lineColor: [200, 100, 20],
      lineWidth: 0.4,
    },
    bodyStyles: {
      fontSize: 6,
      cellPadding: 2,
      textColor: [30, 30, 30],
      valign: "middle",
      lineColor: [80, 80, 80],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [252, 235, 215] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 22, halign: "center" },
      8: { cellWidth: 18, halign: "center" },
      9: { cellWidth: 16, halign: "center" },
      10: { cellWidth: 16, halign: "center" },
      11: { cellWidth: 16, halign: "center" },
      12: { cellWidth: 14, halign: "center" },
      13: { cellWidth: 20 },
      14: { cellWidth: "auto" },
    },
    theme: "grid",
    styles: { lineColor: [80, 80, 80], lineWidth: 0.3, overflow: "linebreak" },
    didDrawPage: (data) => {
      // Re-draw header on subsequent pages
      if (data.pageNumber > 1) {
        doc.setFillColor(0, 51, 102);
        doc.setDrawColor(0, 51, 102);
        doc.setLineWidth(0.6);
        doc.rect(margin, 4, pageWidth - margin * 2, headerHeight, "FD");
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.line(logoDividerX, 4, logoDividerX, 4 + headerHeight);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`POAC Matrix - ${displayYear}`, titleCenterX, 4 + headerHeight / 2 + 3, { align: "center" });
      }

      // Footer on every page
      const footerY = pageHeight - 8;
      doc.setDrawColor(230, 126, 34);
      doc.setLineWidth(0.8);
      doc.line(10, footerY - 3, 30, footerY - 3);
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(
        "+971 50 497 4021   |   1201, Fortune Tower, Cluster C, JLT Dubai   |   operations@oceanemarine.com",
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      doc.text("Dubai | Fujairah | Oman", 10, footerY + 3);
    },
  });

  const safeName = safeProvider.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`POAC_Matrix_${safeName}_${displayYear}.pdf`);
}

/* ── Column headers for the full detail table ── */
const DETAIL_COLUMNS = [
  { key: "stsServiceProvider", label: "STS Service Provider" },
  { key: "poacName", label: "POAC's Name" },
  { key: "validPassport", label: "Valid Passport", fileKey: "validPassportFile" },
  { key: "validMastersCOC", label: "Valid Master's COC", fileKey: "validMastersCOCFile" },
  { key: "dangerousCargoEndorsementOil", label: "Dangerous cargo endorsement(Oil)", fileKey: "dangerousCargoEndorsementOilFile" },
  { key: "dangerousCargoEndorsementChem", label: "Dangerous cargo endorsement(Chem)", fileKey: "dangerousCargoEndorsementChemFile" },
  { key: "dangerousCargoEndorsementGas", label: "Dangerous cargo endorsements(Gas)", fileKey: "dangerousCargoEndorsementGasFile" },
  { key: "oilSpillResponseTraining", label: "Oil spill response training", fileKey: "oilSpillResponseTrainingFile" },
  { key: "stsSimulatorTraining", label: "STS Simulator training", fileKey: "stsSimulatorTrainingFile" },
  { key: "vesselSizeLimitations", label: "Vessel Size Limitations", fileKey: "vesselSizeLimitationsFile" },
  { key: "underwayOperations", label: "Underway operations", fileKey: "underwayOperationsFile" },
  { key: "validMedicals", label: "Valid Medicals", fileKey: "validMedicalsFile" },
  { key: "experienceWithOceane", label: "Experience with Oceane" },
  { key: "remarks", label: "Remarks: Locations / etc" },
];

/* ── Main list component ── */
export default function PoacMatrixListPage({ onRefresh }) {
  const router = useRouter();
  const { setPageLoading } = useHrLoading();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [pdfDownloadingId, setPdfDownloadingId] = useState(null);

  useEffect(() => {
    fetchRecords();
    const handleRefresh = () => fetchRecords();
    window.addEventListener("refreshPoacMatrix", handleRefresh);
    return () => window.removeEventListener("refreshPoacMatrix", handleRefresh);
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setPageLoading(true);
      setError("");
      const res = await fetch("/api/hr/poac-matrix/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to fetch records");
      setRecords(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const handleView = (record) => setSelectedRecord(record);
  const closeModal = () => setSelectedRecord(null);

  const handleEdit = (record) => {
    router.push(`/hr/poac-matrix?tab=form&edit=${record._id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this entire record and all its rows?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/hr/poac-matrix/${id}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to delete");
      setActionMessage("Record deleted successfully!");
      fetchRecords();
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (row, recordId, rowIndex) => {
    if (!row.attachment?.fileUrl) {
      alert("No file attached to this row");
      return;
    }
    const key = `${recordId}-${rowIndex}`;
    try {
      setDownloadingKey(key);
      const res = await fetch(row.attachment.fileUrl);
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.attachment.originalFileName || "attachment";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message || "Failed to download file");
    } finally {
      setDownloadingKey(null);
    }
  };

  // Download PDF for a specific record
  const handleRecordPDF = async (record) => {
    const rows = record.rows || [];
    if (rows.length === 0) {
      setError("No POAC rows in this record");
      setTimeout(() => setError(""), 4000);
      return;
    }
    try {
      setPdfDownloadingId(record._id);
      const provider = rows[0]?.stsServiceProvider || "POAC";
      const recordYear = record.createdAt ? new Date(record.createdAt).getFullYear() : new Date().getFullYear();
      await generatePoacMatrixPDF(rows, provider, recordYear);
    } catch (err) {
      setError(err.message || "PDF download failed");
      setTimeout(() => setError(""), 5000);
    } finally {
      setPdfDownloadingId(null);
    }
  };

  // Get a summary for each record (first row's STS provider, count of POACs)
  const getRecordSummary = (record) => {
    const rows = record.rows || [];
    const provider = rows[0]?.stsServiceProvider || "—";
    const poacNames = rows.map((r) => r.poacName).filter(Boolean);
    return { provider, poacCount: rows.length, poacNames };
  };

  return (
    <>
      <div className="space-y-6">
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

        {/* Table — one row per record */}
        <main>
          {loading ? (
            <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
              <p className="text-white/60">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
              <p className="text-white/60">No records found</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                      <th className="px-4 py-4 font-semibold w-[60px]">S.No</th>
                      <th className="px-4 py-4 font-semibold w-[40%]">STS Service Provider</th>
                      <th className="px-4 py-4 font-semibold text-center w-[20%]">No. of POACs</th>
                      <th className="px-4 py-4 font-semibold text-right w-[20%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, idx) => {
                      const { provider, poacCount, poacNames } = getRecordSummary(record);
                      return (
                        <tr
                          key={record._id}
                          className="border-b border-white/5 hover:bg-white/5 transition"
                        >
                          <td className="px-4 py-4 text-white/70 font-mono">{idx + 1}</td>
                          <td className="px-4 py-4 text-white font-medium">{provider}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center justify-center bg-orange-500/20 text-orange-300 text-xs font-bold px-2.5 py-1 rounded-full min-w-[28px]">
                              {poacCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <ViewIconButton onClick={() => handleView(record)} />
                              <EditIconButton onClick={() => handleEdit(record)} />
                              <DownloadIconButton
                                onClick={() => handleRecordPDF(record)}
                                disabled={pdfDownloadingId === record._id}
                                loading={pdfDownloadingId === record._id}
                              />
                              <DeleteIconButton
                                onClick={() => handleDelete(record._id)}
                                disabled={deletingId === record._id}
                                loading={deletingId === record._id}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── View Modal — full detail table (like Excel) ── */}
      {selectedRecord &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              className="relative bg-slate-900 rounded-2xl border border-white/20 shadow-2xl w-[95vw] max-w-[1400px] mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-6 py-5 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-white">POAC Matrix Record</h3>
                  <p className="text-sm text-white/50 mt-0.5">
                    {selectedRecord.rows?.length || 0} POAC{(selectedRecord.rows?.length || 0) !== 1 ? "s" : ""} · {selectedRecord.rows?.[0]?.stsServiceProvider || "—"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body — scrollable table */}
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-800 text-left">
                      <th className="px-3 py-3 text-xs uppercase tracking-wider font-bold text-orange-300 border-b border-white/10 whitespace-nowrap sticky left-0 bg-slate-800 z-20 min-w-[50px]">
                        S.No
                      </th>
                      {DETAIL_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-3 text-xs uppercase tracking-wider font-bold text-orange-300 border-b border-white/10 whitespace-nowrap min-w-[120px]"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-xs uppercase tracking-wider font-bold text-orange-300 border-b border-white/10 whitespace-nowrap min-w-[80px] text-center">
                        File
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRecord.rows || []).map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={`border-b border-white/5 hover:bg-white/5 transition ${
                          rowIndex % 2 === 0 ? "bg-white/[0.02]" : ""
                        }`}
                      >
                        <td className="px-3 py-3 text-white/70 font-mono text-center sticky left-0 bg-slate-900/90 z-10 border-r border-white/5">
                          {rowIndex + 1}
                        </td>
                        {DETAIL_COLUMNS.map((col) => {
                          const val = row[col.key] || "—";
                          const isYesNo = ["Yes", "No"].includes(val);
                          const optionFile = col.fileKey ? row[col.fileKey] : null;
                          const hasFile = optionFile?.fileUrl;
                          return (
                            <td key={col.key} className="px-3 py-3 text-white whitespace-nowrap">
                              {isYesNo ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded ${
                                      val === "Yes"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-red-500/15 text-red-300"
                                    }`}
                                  >
                                    {val}
                                  </span>
                                  {val === "Yes" && hasFile && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const a = document.createElement("a");
                                        a.href = optionFile.fileUrl;
                                        a.download = optionFile.originalFileName || "file";
                                        a.target = "_blank";
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                      }}
                                      title={`Download: ${optionFile.originalFileName || "file"}`}
                                      className="p-0.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 transition inline-flex"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-white/90">{val}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          {row.attachment?.fileUrl ? (
                            <DownloadIconButton
                              onClick={() => handleDownload(row, selectedRecord._id, rowIndex)}
                              disabled={downloadingKey === `${selectedRecord._id}-${rowIndex}`}
                              loading={downloadingKey === `${selectedRecord._id}-${rowIndex}`}
                            />
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
