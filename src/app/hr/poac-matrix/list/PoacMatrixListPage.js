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

/* ── Column headers for the full detail table ── */
const DETAIL_COLUMNS = [
  { key: "stsServiceProvider", label: "STS Service Provider" },
  { key: "poacName", label: "POAC's Name" },
  { key: "validPassport", label: "Valid Passport" },
  { key: "validMastersCOC", label: "Valid Master's COC" },
  { key: "dangerousCargoEndorsementOil", label: "Dangerous cargo endorsement(Oil)" },
  { key: "dangerousCargoEndorsementChem", label: "Dangerous cargo endorsement(Chem)" },
  { key: "dangerousCargoEndorsementGas", label: "Dangerous cargo endorsements(Gas)" },
  { key: "oilSpillResponseTraining", label: "Oil spill response training" },
  { key: "stsSimulatorTraining", label: "STS Simulator training" },
  { key: "vesselSizeLimitations", label: "Vessel Size Limitations" },
  { key: "underwayOperations", label: "Underway operations" },
  { key: "validMedicals", label: "Valid Medicals" },
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
                          return (
                            <td key={col.key} className="px-3 py-3 text-white whitespace-nowrap">
                              {isYesNo ? (
                                <span
                                  className={`inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded ${
                                    val === "Yes"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-red-500/15 text-red-300"
                                  }`}
                                >
                                  {val}
                                </span>
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
