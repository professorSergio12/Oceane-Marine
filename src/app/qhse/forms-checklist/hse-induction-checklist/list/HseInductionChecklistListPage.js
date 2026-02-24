"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import QhseSidebar from "../../../components/QhseSidebar";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, ViewIconButton, ApproveIconButton, RejectIconButton } from "../../../components/ActionIcons";
import { useEffect, useState } from "react";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";

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

/** Normalize signature image src from external form (base64 data URL). Returns null for plain text so we don't show broken img. */
function getSignatureSrc(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image")) return trimmed;
  if (/^[A-Za-z0-9+/=]{50,}$/.test(trimmed))
    return `data:image/png;base64,${trimmed}`;
  return null; // plain text or too short to be base64
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

// Question mappings for HSE Checklist
const hseChecklistQuestions = {
  hsePolicy: "HSE Policy",
  facilityTour:
    "A facility tour including a discussion of the types of processes performed, location of bulletin boards for postings, breakrooms, restrooms, First-Aid cabinets, fire-fighting equipment, evacuation routes & assembly areas",
  reportingFire: "Reporting fire",
  occupationalHazards: "Occupational Hazards",
  injuryIllnessNearMissReporting:
    "The procedure for reporting an industrial injury, illness, near-miss accident, or an unsafe condition",
  emergencyActionPlan: "The facility Emergency Action Plan",
  wasteManagementProcedures: "Waste Management Procedures",
  ppeRequirements:
    "PPE (Personal Protective Equipment) requirements by area including the proper use, care & maintenance of such equipment",
  hazcomMsds:
    "(HazCom) - Location of MSDS sheets, summary of hazardous chemicals on site",
  spillReportingProcedures:
    "The procedure for reporting spills, and the importance of keeping containers covered",
  ergonomicsAwareness: "Ergonomics (awareness)",
  housekeepingExpectations:
    "The importance and expectations for good housekeeping",
  disciplinaryProcedure:
    "The disciplinary procedure for Safety and Environmental Violations",
};

// Question mappings for Job Specific Checklist
const jobSpecificChecklistQuestions = {
  safeOperationOfToolsMachinery:
    "Safe operation of any tools/machinery that may be required",
  trainingAndCertificationRequirements:
    "Training & certification requirements prior to driving a forklift or other motorized equipment",
  riskAssessmentOverview: "Risk Assessment overview",
  safeLiftingAndBackInjuryPrevention: "Safe Lifting & Back Injury Prevention",
  craneOperationAndSlingInspection: "Safe crane operation & sling inspection",
  loadingUnloadingHandlingProcedures:
    "Procedures for safely loading/unloading and handling of equipment",
};

// Generate dynamic years
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function HseInductionChecklistListPage() {
  const { contentClassName } = useQhseSidebar();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formToReject, setFormToReject] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState("pending"); // "pending", "approved", "rejected", "all"
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/form-checklist/hse-induction-checklist/list");
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
        ? `/api/qhse/form-checklist/hse-induction-checklist/list?year=${year}`
        : "/api/qhse/form-checklist/hse-induction-checklist/list";
      const res = await fetch(url);

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error(
          `Server returned non-JSON response. Status: ${res.status}`
        );
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load forms");
      }
      setForms(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [year]);

  // Filter forms based on selected filter
  const filteredForms = forms.filter((form) => {
    if (filter === "pending") return form.status === "Pending";
    if (filter === "approved") return form.status === "Approved";
    if (filter === "rejected") return form.status === "Rejected";
    return true; // "all"
  });

  // Clear selected form if it doesn't match current filter
  useEffect(() => {
    if (selectedForm) {
      const isVisible = filteredForms.some((f) => f._id === selectedForm._id);
      if (!isVisible) {
        setSelectedForm(null);
      }
    }
  }, [filter, filteredForms, selectedForm]);

  const totalPages = Math.ceil(filteredForms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentForms = filteredForms.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApprove = async (formId) => {
    if (
      !confirm("Are you sure you want to approve this HSE Induction Checklist?")
    ) {
      return;
    }

    setApproving(formId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/hse-induction-checklist/${formId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedBy: "admin", // Replace with actual user ID from auth
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve checklist");
      }

      await fetchForms();
      // Update selected form if it's the one that was approved
      if (selectedForm?._id === formId && data.data) {
        setSelectedForm(data.data);
      }
      alert("HSE Induction Checklist approved successfully!");
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

    setRejecting(formToReject._id);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/hse-induction-checklist/${formToReject._id}/reject`,
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
        throw new Error(data.error || "Failed to reject checklist");
      }

      await fetchForms();
      // Update selected form if it's the one that was rejected
      if (selectedForm?._id === formToReject._id && data.data) {
        setSelectedForm(data.data);
      }
      setShowRejectModal(false);
      setRejectionReason("");
      setFormToReject(null);
      alert("HSE Induction Checklist rejected successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setRejecting(null);
    }
  };

  const openRejectModal = (form) => {
    setFormToReject(form);
    setShowRejectModal(true);
    setRejectionReason("");
  };

  const handleArchive = async (form) => {
    if (!confirm("Archive this record? It will be stored in QHSE Archive (HSE Induction Checklist).")) return;
    setArchivingId(form._id);
    setError(null);
    try {
      const title = form.employeeOrContractorName || form.serialNumber || form.formCode || form._id;
      const payload = buildArchivePayload(ARCHIVE_MODULES.HSE_INDUCTION_CHECKLIST, form, title, form.formCode || form.formNo);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setForms((prev) => prev.filter((f) => f._id !== form._id));
      if (selectedForm?._id === form._id) setSelectedForm(null);
    } catch (err) {
      setError(err.message || "Failed to archive");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (form) => {
    if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
    setDeleting(form._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/form-checklist/hse-induction-checklist/${form._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setForms((prev) => prev.filter((f) => f._id !== form._id));
      if (selectedForm?._id === form._id) setSelectedForm(null);
    } catch (err) {
      setError(err.message || "Failed to delete record");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex">
        <QhseSidebar />
        <div className={`${contentClassName} flex items-center justify-center`}>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${contentClassName} pr-4`}>
        <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
          <header className="flex items-start gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
                QHSE / Forms & Checklist / HSE Induction Checklist
              </p>
              <h1 className="text-2xl font-bold text-white">HSE Induction Checklist</h1>
              <p className="text-sm text-slate-200 mt-1">
                Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-008</span>
              </p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <TemplateDownloadLink formCode="QAF-OFD-008" />
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
          </header>

          {/* Filter Tabs – same style as Subcontractor Audit */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setFilter("pending"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                filter === "pending"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Pending Review
            </button>
            <button
              type="button"
              onClick={() => { setFilter("approved"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                filter === "approved"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => { setFilter("rejected"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                filter === "rejected"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Rejected
            </button>
            <button
              type="button"
              onClick={() => { setFilter("all"); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                filter === "all"
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              All
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <main className="space-y-6">
            {/* Detail Card – shows when a form is selected (same pattern as Subcontractor Audit) */}
            {selectedForm && (
              <div className="w-full rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        HSE Induction Checklist Details
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        FORM CODE:{" "}
                        <span className="font-mono text-sky-300">
                          {selectedForm.formCode || selectedForm.formNo || "—"}
                        </span>
                        {" · "}
                        SERIAL:{" "}
                        <span className="font-mono text-sky-300">
                          {selectedForm.serialNumber || "—"}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border ${
                        selectedForm.status === "Approved"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                          : selectedForm.status === "Rejected"
                          ? "bg-red-500/20 text-red-300 border-red-400/50"
                          : "bg-blue-500/20 text-blue-300 border-blue-400/50"
                      }`}
                    >
                      {selectedForm.status || "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArchiveIconButton
                      onClick={() => handleArchive(selectedForm)}
                      disabled={archivingId === selectedForm._id || deleting === selectedForm._id}
                      loading={archivingId === selectedForm._id}
                    />
                    <DeleteIconButton
                      onClick={() => handleDelete(selectedForm)}
                      disabled={archivingId === selectedForm._id || deleting === selectedForm._id}
                      loading={deleting === selectedForm._id}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedForm(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition text-white text-xl font-bold"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Employee/Contractor Details */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                      Employee / Contractor Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Name: </span>
                        <span className="text-white font-semibold">
                          {selectedForm.employeeOrContractorName || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Date of Induction: </span>
                        <span className="text-white font-semibold">
                          {formatDate(selectedForm.dateOfInduction)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Location: </span>
                        <span className="text-white font-semibold">
                          {selectedForm.location || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Form Code: </span>
                        <span className="text-white font-semibold font-mono">
                          {selectedForm.formCode || selectedForm.formNo || "—"}
                        </span>
                      </div>
                      {selectedForm.serialNumber && (
                        <div>
                          <span className="text-slate-400">Serial: </span>
                          <span className="text-white font-semibold font-mono">
                            {selectedForm.serialNumber}
                          </span>
                        </div>
                      )}
                      {(selectedForm.version || selectedForm.revisionNo) && (
                        <div>
                          <span className="text-slate-400">Version: </span>
                          <span className="text-white font-semibold">
                            {selectedForm.version || selectedForm.revisionNo}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">Status: </span>
                        {getStatusBadge(selectedForm.status)}
                      </div>
                    </div>
                  </div>

                  {/* HSE Checklist */}
                  <div>
                    <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                      HSE Policy Checklist
                    </h3>
                    <div className="space-y-2 mt-4">
                      {Object.entries(hseChecklistQuestions).map(
                        ([key, question]) => (
                          <div
                            key={key}
                            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                          >
                            <div className="flex-1">
                              <p className="text-sm text-white/90">
                                {question}
                              </p>
                            </div>
                            <div className="shrink-0">
                              {selectedForm.hseChecklist?.[key] ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                                  ✓ Discussed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 border border-gray-500/50 text-gray-400">
                                  ✗ Not Discussed
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Job Specific Checklist */}
                  <div>
                    <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                      As appropriate by job function & facility operation
                    </h3>
                    <div className="space-y-2 mt-4">
                      {Object.entries(jobSpecificChecklistQuestions).map(
                        ([key, question]) => (
                          <div
                            key={key}
                            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                          >
                            <div className="flex-1">
                              <p className="text-sm text-white/90">
                                {question}
                              </p>
                            </div>
                            <div className="shrink-0">
                              {selectedForm.jobSpecificChecklist?.[key] ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                                  ✓ Discussed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 border border-gray-500/50 text-gray-400">
                                  ✗ Not Discussed
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Signatures */}
                  {selectedForm.signatures && (
                        <div className="border-t border-white/10 pt-4 space-y-4">
                          <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                            Signatures
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            {/* Employee Signature */}
                            <div className="space-y-2">
                              <div>
                                <span className="text-slate-400">Employee Signature: </span>
                                {selectedForm.signatures.employeeSignatureDate && (
                                  <span className="text-white font-semibold ml-1">
                                    Date: {formatDate(selectedForm.signatures.employeeSignatureDate)}
                                  </span>
                                )}
                              </div>
                              <div className="p-4 rounded-lg border border-white/20 bg-white/5 min-h-[80px]">
                                {getSignatureSrc(selectedForm.signatures.employeeSignature) ? (
                                  <>
                                    <img
                                      src={getSignatureSrc(selectedForm.signatures.employeeSignature)}
                                      alt="Employee Signature"
                                      className="max-h-28 w-auto max-w-[240px] border border-white/20 rounded-lg bg-white object-contain block"
                                      style={{ minHeight: 56 }}
                                      decoding="async"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        const fallback = e.target.nextElementSibling;
                                        if (fallback) fallback.classList.remove("hidden");
                                      }}
                                    />
                                    <p className="text-white/70 text-xs hidden">Signature image could not be displayed.</p>
                                  </>
                                ) : (
                                  <p className="text-white/90 break-words">
                                    {selectedForm.signatures.employeeSignature && selectedForm.signatures.employeeSignature.trim()
                                      ? selectedForm.signatures.employeeSignature
                                      : "—"}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Signature of Person Giving Induction */}
                            <div className="space-y-2">
                              <div>
                                <span className="text-slate-400">Signature of Person Giving Induction: </span>
                              </div>
                              <div className="p-4 rounded-lg border border-white/20 bg-white/5 min-h-[80px]">
                                {getSignatureSrc(selectedForm.signatures.inductionGivenBySignature) ? (
                                  <>
                                    <img
                                      src={getSignatureSrc(selectedForm.signatures.inductionGivenBySignature)}
                                      alt="Induction Given By Signature"
                                      className="max-h-28 w-auto max-w-[240px] border border-white/20 rounded-lg bg-white object-contain block"
                                      style={{ minHeight: 56 }}
                                      decoding="async"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        const fallback = e.target.nextElementSibling;
                                        if (fallback) fallback.classList.remove("hidden");
                                      }}
                                    />
                                    <p className="text-white/70 text-xs hidden">Signature image could not be displayed.</p>
                                  </>
                                ) : (
                                  <p className="text-white/90 break-words">
                                    {selectedForm.signatures.inductionGivenBySignature && selectedForm.signatures.inductionGivenBySignature.trim()
                                      ? selectedForm.signatures.inductionGivenBySignature
                                      : "—"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="pt-4 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-4 text-xs text-white/60">
                          {selectedForm.submittedBy && (
                            <div>
                              <span>Submitted By:</span>
                              <span className="ml-2 text-white/90">
                                {selectedForm.submittedBy}
                              </span>
                            </div>
                          )}
                          {selectedForm.createdAt && (
                            <div>
                              <span>Created:</span>
                              <span className="ml-2 text-white/90">
                                {formatDateTime(selectedForm.createdAt)}
                              </span>
                            </div>
                          )}
                          {selectedForm.updatedAt && (
                            <div>
                              <span>Last Updated:</span>
                              <span className="ml-2 text-white/90">
                                {formatDateTime(selectedForm.updatedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rejection Reason */}
                      {selectedForm.status === "Rejected" && selectedForm.rejectionReason && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3">
                            <p className="text-xs font-semibold text-red-300 mb-1">
                              Rejection Reason:
                            </p>
                            <p className="text-sm text-red-200">
                              {selectedForm.rejectionReason}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Admin Actions */}
                      {selectedForm.status === "Pending" && (
                        <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                          <ApproveIconButton
                            onClick={() => handleApprove(selectedForm._id)}
                            disabled={approving === selectedForm._id}
                            loading={approving === selectedForm._id}
                          />
                          <RejectIconButton
                            onClick={() => openRejectModal(selectedForm)}
                            disabled={approving === selectedForm._id}
                            loading={rejecting === selectedForm._id}
                          />
                        </div>
                      )}
                </div>
              </div>
            )}

            {!selectedForm && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
                {filteredForms.length === 0 ? (
                  <p className="text-white/60 text-center py-8">
                    {filter === "pending"
                      ? "No pending HSE induction checklists."
                      : filter === "approved"
                      ? "No approved checklists."
                      : filter === "rejected"
                      ? "No rejected checklists."
                      : "No HSE induction checklists found."}
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-300 uppercase tracking-wider text-xs">
                            <th className="pb-3 pr-4">Form Code</th>
                            <th className="pb-3 pr-4">Serial No</th>
                            <th className="pb-3 pr-4">Employee Name</th>
                            <th className="pb-3 pr-4">Date of Induction</th>
                            <th className="pb-3 pr-4">Location</th>
                            <th className="pb-3 pr-4">Status</th>
                            <th className="pb-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentForms.map((form) => (
                            <tr
                              key={form._id}
                              className="border-b border-white/5 hover:bg-white/5 transition"
                            >
                              <td className="py-3 pr-4 font-mono text-white/90">
                                {form.formCode || form.formNo || "—"}
                              </td>
                              <td className="py-3 pr-4 text-white/90">
                                {form.serialNumber || "—"}
                              </td>
                              <td className="py-3 pr-4 text-white/90">
                                {form.employeeOrContractorName || "—"}
                              </td>
                              <td className="py-3 pr-4 text-white/90">
                                {formatDate(form.dateOfInduction)}
                              </td>
                              <td className="py-3 pr-4 text-white/90">
                                {form.location || "—"}
                              </td>
                              <td className="py-3 pr-4">
                                {getStatusBadge(form.status)}
                              </td>
                              <td className="py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <ViewIconButton
                                    onClick={() => setSelectedForm(form)}
                                    title="View Details"
                                  />
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
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 text-xs text-white/70">
                        <span>
                          Showing {startIndex + 1} to{" "}
                          {Math.min(endIndex, filteredForms.length)} of{" "}
                          {filteredForms.length}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1.5">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">
              Reject HSE Induction Checklist
            </h3>
            <p className="text-sm text-white/70 mb-4">
              Please provide a reason for rejecting this checklist:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setFormToReject(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 font-semibold text-sm hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejecting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 font-semibold text-sm hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
