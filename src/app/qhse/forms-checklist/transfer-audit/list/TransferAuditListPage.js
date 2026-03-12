"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton } from "../../../components/ActionIcons";

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

function getStatusBadge(status) {
  const statusConfig = {
    Pending: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/50",
      text: "text-yellow-300",
      label: "Pending Review",
    },
    Approved: {
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/50",
      text: "text-emerald-300",
      label: "Approved",
    },
    Rejected: {
      bg: "bg-red-500/20",
      border: "border-red-500/50",
      text: "text-red-300",
      label: "Rejected",
    },
  };

  const config = statusConfig[status] || statusConfig.Pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.border} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// Generate dynamic years
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function TransferAuditListPage() {
  const { contentClassName } = useQhseSidebar();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [filter, setFilter] = useState("pending"); // "pending", "all", "approved", "rejected"
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/form-checklist/transfer-audit/list");
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

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = year !== "" && year != null
        ? `/api/qhse/form-checklist/transfer-audit/list?year=${year}`
        : "/api/qhse/form-checklist/transfer-audit/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load forms");
      }
      setForms(data.data || []);
      if (selectedForm) {
        const updated = (data.data || []).find(
          (f) => f._id === selectedForm._id
        );
        if (updated) setSelectedForm(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [year]);

  const handleViewDetails = (form) => {
    setSelectedForm(form);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApprove = async (formId) => {
    if (
      !confirm(
        "Are you sure you want to approve this Transfer Audit form?"
      )
    ) {
      return;
    }

    setApproving(formId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/transfer-audit/${formId}/approve`,
        {
          method: "PUT",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve form");
      }

      await fetchForms();
      setSelectedForm(null);
      alert("Transfer Audit form approved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleArchive = async (form, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Archive this record? It will be stored in QHSE Archive (Transfer Audit).")) return;
    setArchivingId(form._id);
    setError(null);
    try {
      const payload = buildArchivePayload(ARCHIVE_MODULES.TRANSFER_AUDIT, form, form.formCode || form.serialNumber, form.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setForms((prev) => prev.filter((f) => f._id !== form._id));
      if (selectedForm && String(selectedForm._id) === String(form._id)) setSelectedForm(null);
    } catch (err) {
      setError(err.message || "Failed to archive");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (formId, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
    setDeleting(formId);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/form-checklist/transfer-audit/${formId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setForms((prev) => prev.filter((f) => f._id !== formId));
      if (selectedForm && String(selectedForm._id) === String(formId)) setSelectedForm(null);
    } catch (err) {
      setError(err.message || "Failed to delete record");
    } finally {
      setDeleting(null);
    }
  };

  // Filter forms based on selected filter
  const filteredForms = forms.filter((form) => {
    if (filter === "pending") return form.status === "Pending";
    if (filter === "approved") return form.status === "Approved";
    if (filter === "rejected") return form.status === "Rejected";
    return true; // "all"
  });

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
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
                QHSE / Forms & Checklist / Transfer Audit
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Transfer Audit Forms</h1>
              <p className="text-sm text-slate-200 mt-1">
                Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-003</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <TemplateDownloadLink formCode="QAF-OFD-003" />
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
          </div>
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        <main>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "pending"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }`}
            >
              Pending Review
            </button>
            <button
              type="button"
              onClick={() => setFilter("approved")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "approved"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }`}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => setFilter("rejected")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "rejected"
                  ? "bg-red-500/20 text-red-300 border border-red-500/50"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }`}
            >
              Rejected
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "all"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/50"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }`}
            >
              All
            </button>
          </div>

          {filteredForms.length === 0 ? (
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
                {filter === "pending"
                  ? "No pending forms found"
                  : filter === "approved"
                  ? "No approved forms found"
                  : filter === "rejected"
                  ? "No rejected forms found"
                  : "No forms found"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detail Card - Show when form is selected */}
              {selectedForm && (
                <div className="rounded-2xl border border-white/10 bg-slate-800 p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Form Details
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        {selectedForm.formCode}
                        {selectedForm.serialNumber && ` • ${selectedForm.serialNumber}`} • v{selectedForm.version}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedForm(null)}
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                    >
                      <svg
                        className="h-5 w-5"
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

                  {/* Header Information */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-white/10">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Status</p>
                      {getStatusBadge(selectedForm.status)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Version</p>
                      <p className="text-sm text-white">v{selectedForm.version}</p>
                    </div>
                    {selectedForm.header?.locationName && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Location</p>
                        <p className="text-sm text-white">
                          {selectedForm.header.locationName}
                        </p>
                      </div>
                    )}
                    {selectedForm.header?.date && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Date</p>
                        <p className="text-sm text-white">
                          {formatDate(selectedForm.header.date)}
                        </p>
                      </div>
                    )}
                    {selectedForm.header?.jobNo && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Job No</p>
                        <p className="text-sm text-white">
                          {selectedForm.header.jobNo}
                        </p>
                      </div>
                    )}
                    {selectedForm.header?.dischargingVessel && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Discharging Vessel</p>
                        <p className="text-sm text-white">
                          {selectedForm.header.dischargingVessel}
                        </p>
                      </div>
                    )}
                    {selectedForm.header?.receivingVessel && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Receiving Vessel</p>
                        <p className="text-sm text-white">
                          {selectedForm.header.receivingVessel}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Section A - Pre-Planning */}
                  {selectedForm.sectionA_PrePlanning && selectedForm.sectionA_PrePlanning.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                        Section A – Pre-Planning
                      </h3>
                      <div className="space-y-3">
                        {selectedForm.sectionA_PrePlanning.map((q, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-sky-300 min-w-[40px]">{q.qNo || `${idx + 1}.`}</span>
                              <div className="flex-1">
                                <p className="text-sm text-white mb-2">{q.question || "—"}</p>
                                <div className="flex items-center gap-4">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    q.answer === "Yes" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                                    q.answer === "No" ? "bg-red-500/20 text-red-300 border border-red-500/40" :
                                    "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                  }`}>
                                    {q.answer || "—"}
                                  </span>
                                  {q.remarks && (
                                    <span className="text-xs text-slate-300">Remarks: {q.remarks}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section B - Mobilization to Demobilization */}
                  {selectedForm.sectionB_MobilizationToDemobilization && selectedForm.sectionB_MobilizationToDemobilization.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                        Section B – Mobilization to Demobilization
                      </h3>
                      <div className="space-y-3">
                        {selectedForm.sectionB_MobilizationToDemobilization.map((q, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-sky-300 min-w-[40px]">{q.qNo || `${idx + 1}.`}</span>
                              <div className="flex-1">
                                <p className="text-sm text-white mb-2">{q.question || "—"}</p>
                                <div className="flex items-center gap-4">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    q.answer === "Yes" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                                    q.answer === "No" ? "bg-red-500/20 text-red-300 border border-red-500/40" :
                                    "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                  }`}>
                                    {q.answer || "—"}
                                  </span>
                                  {q.remarks && (
                                    <span className="text-xs text-slate-300">Remarks: {q.remarks}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section C - Support Craft */}
                  {selectedForm.sectionC_SupportCraft && selectedForm.sectionC_SupportCraft.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                        Section C – Support Craft
                      </h3>
                      <div className="space-y-3">
                        {selectedForm.sectionC_SupportCraft.map((q, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-sky-300 min-w-[40px]">{q.qNo || `${idx + 1}.`}</span>
                              <div className="flex-1">
                                <p className="text-sm text-white mb-2">{q.question || "—"}</p>
                                <div className="flex items-center gap-4">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    q.answer === "Yes" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                                    q.answer === "No" ? "bg-red-500/20 text-red-300 border border-red-500/40" :
                                    "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                  }`}>
                                    {q.answer || "—"}
                                  </span>
                                  {q.remarks && (
                                    <span className="text-xs text-slate-300">Remarks: {q.remarks}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section D - STS Equipment */}
                  {selectedForm.sectionD_STSEquipment && selectedForm.sectionD_STSEquipment.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                        Section D – STS Equipment
                      </h3>
                      <div className="space-y-3">
                        {selectedForm.sectionD_STSEquipment.map((q, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-sky-300 min-w-[40px]">{q.qNo || `${idx + 1}.`}</span>
                              <div className="flex-1">
                                <p className="text-sm text-white mb-2">{q.question || "—"}</p>
                                <div className="flex items-center gap-4">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    q.answer === "Yes" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                                    q.answer === "No" ? "bg-red-500/20 text-red-300 border border-red-500/40" :
                                    "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                  }`}>
                                    {q.answer || "—"}
                                  </span>
                                  {q.remarks && (
                                    <span className="text-xs text-slate-300">Remarks: {q.remarks}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section E - Post Operation */}
                  {selectedForm.sectionE_PostOperation && selectedForm.sectionE_PostOperation.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                        Section E – Post Operation
                      </h3>
                      <div className="space-y-3">
                        {selectedForm.sectionE_PostOperation.map((q, idx) => (
                          <div key={idx} className="bg-white/5 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-sky-300 min-w-[40px]">{q.qNo || `${idx + 1}.`}</span>
                              <div className="flex-1">
                                <p className="text-sm text-white mb-2">{q.question || "—"}</p>
                                <div className="flex items-center gap-4">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    q.answer === "Yes" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                                    q.answer === "No" ? "bg-red-500/20 text-red-300 border border-red-500/40" :
                                    "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                  }`}>
                                    {q.answer || "—"}
                                  </span>
                                  {q.remarks && (
                                    <span className="text-xs text-slate-300">Remarks: {q.remarks}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {selectedForm.comments?.remarks && (
                    <div className="space-y-2 pt-4 border-t border-white/10">
                      <h3 className="text-base font-semibold text-white">Comments</h3>
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-slate-200">{selectedForm.comments.remarks}</p>
                      </div>
                    </div>
                  )}

                  {/* Completed By & Signature */}
                  <div className="pt-4 border-t border-white/10 space-y-4">
                    <h3 className="text-base font-semibold text-white">Completed By</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedForm.completedBy?.name && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Name</p>
                          <p className="text-sm text-white">{selectedForm.completedBy.name}</p>
                        </div>
                      )}
                      {selectedForm.completedBy?.date && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Date</p>
                          <p className="text-sm text-white">{formatDate(selectedForm.completedBy.date)}</p>
                        </div>
                      )}
                    </div>
                    {(selectedForm.completedBy?.signatureText || selectedForm.completedBy?.signaturePhoto || selectedForm.completedBy?.signatureUrl) && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Signature</p>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-2">
                          {selectedForm.completedBy.signatureText && (
                            <p className="text-sm text-white">{selectedForm.completedBy.signatureText}</p>
                          )}
                          {(selectedForm.completedBy.signaturePhoto || selectedForm.completedBy.signatureUrl) && (
                            <img
                              src={selectedForm.completedBy.signaturePhoto || selectedForm.completedBy.signatureUrl}
                              alt="Signature"
                              className="max-w-full h-auto max-h-32 object-contain"
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextElementSibling)
                                  e.target.nextElementSibling.style.display = "block";
                              }}
                            />
                          )}
                          <p className="text-xs text-slate-400" style={{ display: "none" }}>
                            Signature image not available
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {selectedForm.status === "Pending" && (
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedForm._id)}
                        disabled={approving === selectedForm._id}
                        className="px-6 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approving === selectedForm._id
                          ? "Approving..."
                          : "Approve"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Table - Hidden when detail card is shown */}
              {!selectedForm && (
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                          <th className="px-6 py-4 font-semibold">Form Code</th>
                          <th className="px-6 py-4 font-semibold">Serial</th>
                          <th className="px-6 py-4 font-semibold">Version</th>
                          <th className="px-6 py-4 font-semibold">Location</th>
                          <th className="px-6 py-4 font-semibold">Job No</th>
                          <th className="px-6 py-4 font-semibold">Date</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredForms.map((form) => (
                          <tr
                            key={form._id}
                            className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                            onClick={() => handleViewDetails(form)}
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-sky-300">
                                {form.formCode || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-slate-200">
                                {form.serialNumber || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-200">
                                v{form.version || "1.0"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-200">
                                {form.header?.locationName || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-200">
                                {form.header?.jobNo || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {formatDate(form.header?.date)}
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(form.status || "Pending")}
                            </td>
                            <td className="px-6 py-4">
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleViewDetails(form)}
                                  className="text-xs text-sky-300 hover:text-sky-200 font-medium px-3 py-1 rounded border border-sky-400/30 hover:bg-sky-400/10 transition"
                                >
                                  View
                                </button>
                                {form.status === "Pending" && (
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(form._id)}
                                    disabled={approving === form._id}
                                    className="text-xs text-emerald-300 hover:text-emerald-200 font-medium px-3 py-1 rounded border border-emerald-400/30 hover:bg-emerald-400/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {approving === form._id
                                      ? "Approving..."
                                      : "Approve"}
                                  </button>
                                )}
                                <ArchiveIconButton
                                  onClick={(e) => handleArchive(form, e)}
                                  disabled={archivingId === form._id || deleting === form._id}
                                  loading={archivingId === form._id}
                                />
                                <DeleteIconButton
                                  onClick={(e) => handleDelete(form._id, e)}
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
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


