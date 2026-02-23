"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ViewIconButton, ArchiveIconButton, DeleteIconButton } from "../../../components/ActionIcons";

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

/** Normalize signature image src from external form (base64 data URL). Ensures it's a string and valid for img src. */
function getSignatureSrc(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed))
    return `data:image/png;base64,${trimmed}`;
  return trimmed;
}

export default function AuditSubContractorListAdminPage() {
  const { contentClassName } = useQhseSidebar();
  const [allAudits, setAllAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [filterStatus, setFilterStatus] = useState("Pending"); // "Pending", "Approved", "Rejected", "All"

  const fetchAudits = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/qhse/due-diligence/audit-sub-contractor/list"
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load audit forms");
      }
      // Load all audits
      setAllAudits(data.subContractorAudits || []);
      if (selectedAudit) {
        const updated = (data.subContractorAudits || []).find(
          (a) => a._id === selectedAudit._id
        );
        if (updated) setSelectedAudit(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter audits based on selected status
  const audits = allAudits.filter((audit) => {
    if (filterStatus === "All") return true;
    return audit.status === filterStatus;
  });

  // Clear selected audit if it doesn't match current filter
  useEffect(() => {
    if (selectedAudit) {
      const matchesFilter =
        filterStatus === "All" || selectedAudit.status === filterStatus;
      if (!matchesFilter) {
        setSelectedAudit(null);
      }
    }
  }, [filterStatus, selectedAudit]);

  useEffect(() => {
    fetchAudits();
  }, []);

  const handleApprove = async (auditId) => {
    if (!confirm("Are you sure you want to approve this audit form?")) {
      return;
    }

    setApproving(auditId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/due-diligence/audit-sub-contractor/${auditId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Approved",
            approvedBy: null, // You can get this from auth context
          }),
        }
      );

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve form");
      }

      await fetchAudits();
      setSelectedAudit(null);
      alert("Audit form approved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (auditId) => {
    if (!confirm("Are you sure you want to reject this audit form?")) {
      return;
    }

    setRejecting(auditId);
    setError(null);
    try {
      const res = await fetch(
        `/api/qhse/due-diligence/audit-sub-contractor/${auditId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Rejected",
            approvedBy: null, // You can get this from auth context
          }),
        }
      );

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reject form");
      }

      await fetchAudits();
      setSelectedAudit(null);
      alert("Audit form rejected successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setRejecting(null);
    }
  };

  const handleArchive = async (audit) => {
    if (!confirm("Archive this audit form? It will be stored in QHSE Archive (Audit Sub Contractor).")) return;
    setArchivingId(audit._id);
    setError(null);
    try {
      const title = audit.subcontractorName || audit.formCode || audit.serialNumber || audit._id;
      const payload = buildArchivePayload(ARCHIVE_MODULES.AUDIT_SUB_CONTRACTOR, audit, title, audit.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      // Keep the form in the list (do not refetch so the archived item stays visible)
      if (selectedAudit?._id === audit._id) setSelectedAudit(null);
      alert("Audit form archived successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (audit) => {
    if (!confirm("Are you sure you want to delete this audit form? This cannot be undone.")) return;
    setDeleting(audit._id);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/due-diligence/audit-sub-contractor/${audit._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setAllAudits((prev) => prev.filter((a) => a._id !== audit._id));
      if (selectedAudit?._id === audit._id) setSelectedAudit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(audits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAudits = audits.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-start gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              QHSE / Due Diligence / Audit Form - Sub Contractor
            </p>
            <h1 className="text-2xl font-bold">Admin Review</h1>
            <p className="text-xs text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-055</span>
              {" • "}
              Review and manage audit forms.
            </p>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFilterStatus("Pending");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              filterStatus === "Pending"
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            Pending Review
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("Approved");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              filterStatus === "Approved"
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("Rejected");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              filterStatus === "Rejected"
                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            Rejected
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterStatus("All");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              filterStatus === "All"
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
          {/* Detail Card - Shows when audit is selected */}
          {selectedAudit && (
            <div className="w-full rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Audit Form Details
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      FORM CODE:{" "}
                      <span className="font-mono text-sky-300">
                        {selectedAudit.formCode || "—"}
                      </span>
                      {" · "}
                      SERIAL:{" "}
                      <span className="font-mono text-sky-300">
                        {selectedAudit.serialNumber || "—"}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border ${
                      selectedAudit.status === "Approved"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                        : selectedAudit.status === "Rejected"
                        ? "bg-red-500/20 text-red-300 border-red-400/50"
                        : "bg-blue-500/20 text-blue-300 border-blue-400/50"
                    }`}
                  >
                    {selectedAudit.status || "Pending"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAudit(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition text-white text-xl font-bold"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Sub-Contractor Details */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                    Sub-Contractor Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Name: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.subcontractorName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Address: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.subcontractorAddress || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Service Type: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.serviceType || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Contact Person: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.contactPerson || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Email: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.emailOfContactPerson || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.phoneOfContactPerson || "—"}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-400">
                        Operating Areas:{" "}
                      </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.operatingAreas || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compliance Information */}
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                    Compliance Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Trade License: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.tradeLicenseCopyAvailable
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">HSE Policy: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.hasHSEPolicy ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Audits Subcontractors:{" "}
                      </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.auditsSubcontractors ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Has Insurance: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.hasInsurance ? "Yes" : "No"}
                      </span>
                    </div>
                    {selectedAudit.hasInsurance && (
                      <div className="md:col-span-2">
                        <span className="text-slate-400">
                          Insurance Details:{" "}
                        </span>
                        <span className="text-white font-semibold">
                          {selectedAudit.insuranceDetails || "—"}
                        </span>
                      </div>
                    )}
                    <div className="md:col-span-3">
                      <span className="text-slate-400">
                        ISO Certifications:{" "}
                      </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.isoCertifications?.join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Office Use */}
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                    Office Use
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">
                        Audit Completed By:{" "}
                      </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.auditCompletedBy?.name || "—"} (
                        {selectedAudit.auditCompletedBy?.designation || "—"})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Signed At: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.auditCompletedBy?.signedAt
                          ? formatDate(
                              selectedAudit.auditCompletedBy.signedAt
                            )
                          : "—"}
                      </span>
                    </div>
                    {(selectedAudit.auditCompletedBy?.signatureText || getSignatureSrc(selectedAudit.auditCompletedBy?.signaturePhoto)) && (
                      <div className="md:col-span-2">
                        <span className="text-slate-400 block mb-1">Audit Completed By – Signature:</span>
                        {selectedAudit.auditCompletedBy?.signatureText && (
                          <p className="text-white font-semibold mb-1">{selectedAudit.auditCompletedBy.signatureText}</p>
                        )}
                        {getSignatureSrc(selectedAudit.auditCompletedBy?.signaturePhoto) && (
                          <img
                            src={getSignatureSrc(selectedAudit.auditCompletedBy.signaturePhoto)}
                            alt="Audit completed by signature"
                            className="max-h-24 w-auto max-w-[200px] border border-white/20 rounded-lg bg-white object-contain block"
                            style={{ minHeight: 48 }}
                            decoding="async"
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">
                        Contractor Approved By:{" "}
                      </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.contractorApprovedBy?.name || "—"} (
                        {selectedAudit.contractorApprovedBy?.designation ||
                          "—"}
                        )
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Signed At: </span>
                      <span className="text-white font-semibold">
                        {selectedAudit.contractorApprovedBy?.signedAt
                          ? formatDate(
                              selectedAudit.contractorApprovedBy.signedAt
                            )
                          : "—"}
                      </span>
                    </div>
                    {(selectedAudit.contractorApprovedBy?.signatureText || getSignatureSrc(selectedAudit.contractorApprovedBy?.signaturePhoto)) && (
                      <div className="md:col-span-2">
                        <span className="text-slate-400 block mb-1">Contractor Approved By – Signature:</span>
                        {selectedAudit.contractorApprovedBy?.signatureText && (
                          <p className="text-white font-semibold mb-1">{selectedAudit.contractorApprovedBy.signatureText}</p>
                        )}
                        {getSignatureSrc(selectedAudit.contractorApprovedBy?.signaturePhoto) && (
                          <img
                            src={getSignatureSrc(selectedAudit.contractorApprovedBy.signaturePhoto)}
                            alt="Contractor approved by signature"
                            className="max-h-24 w-auto max-w-[200px] border border-white/20 rounded-lg bg-white object-contain block"
                            style={{ minHeight: 48 }}
                            decoding="async"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approve/Reject Buttons - Only show for Pending forms */}
                {selectedAudit.status === "Pending" && (
                  <div className="border-t border-white/10 pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleReject(selectedAudit._id)}
                      disabled={rejecting === selectedAudit._id || approving === selectedAudit._id}
                      className="px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold uppercase tracking-wider transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                    >
                      {rejecting === selectedAudit._id
                        ? "Rejecting..."
                        : "Reject Form"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedAudit._id)}
                      disabled={approving === selectedAudit._id || rejecting === selectedAudit._id}
                      className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold uppercase tracking-wider transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
                    >
                      {approving === selectedAudit._id
                        ? "Approving..."
                        : "Approve Form"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table Section - Only show when no audit is selected */}
          {!selectedAudit && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-slate-100">Loading forms…</div>
                </div>
              ) : audits.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-slate-100">
                    No {filterStatus === "All" ? "" : filterStatus.toLowerCase()}{" "}
                    forms found.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-200 border-b border-white/10">
                          <th className="py-3 pr-4 font-semibold">
                            Form Code
                          </th>
                          <th className="py-3 pr-4 font-semibold">
                            Serial No
                          </th>
                          <th className="py-3 pr-4 font-semibold">
                            Sub-Contractor Name
                          </th>
                          <th className="py-3 pr-4 font-semibold">
                            Service Type
                          </th>
                          <th className="py-3 pr-4 font-semibold">
                            Submitted At
                          </th>
                          <th className="py-3 pr-4 font-semibold">Status</th>
                          <th className="py-3 pr-4 font-semibold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAudits.map((audit) => (
                          <tr
                            key={audit._id}
                            className="border-b border-white/5 hover:bg-white/5 transition"
                          >
                            <td className="py-3 pr-4">
                              <span className="font-mono text-sky-300">
                                {audit.formCode || "—"}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="font-mono text-slate-200">
                                {audit.serialNumber || "—"}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="max-w-xs">
                                <p className="text-slate-200">
                                  {audit.subcontractorName || "—"}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              {audit.serviceType || "—"}
                            </td>
                            <td className="py-3 pr-4">
                              {formatDate(audit.updatedAt)}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-wider border ${
                                  audit.status === "Approved"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                                    : audit.status === "Rejected"
                                    ? "bg-red-500/20 text-red-300 border-red-400/50"
                                    : "bg-blue-500/20 text-blue-300 border-blue-400/50"
                                }`}
                              >
                                {audit.status || "Pending"}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <ViewIconButton
                                  onClick={() => setSelectedAudit(audit)}
                                  title="View Details"
                                />
                                <ArchiveIconButton
                                  onClick={() => handleArchive(audit)}
                                  disabled={archivingId === audit._id || deleting === audit._id}
                                  loading={archivingId === audit._id}
                                />
                                <DeleteIconButton
                                  onClick={() => handleDelete(audit)}
                                  disabled={archivingId === audit._id || deleting === audit._id}
                                  loading={deleting === audit._id}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="text-xs text-slate-300">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(endIndex, audits.length)} of {audits.length}{" "}
                        {filterStatus === "All" ? "" : filterStatus.toLowerCase()}{" "}
                        forms
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                              return (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 &&
                                  page <= currentPage + 1)
                              );
                            })
                            .map((page, index, array) => {
                              const showEllipsisBefore =
                                index > 0 && array[index - 1] !== page - 1;
                              return (
                                <div
                                  key={page}
                                  className="flex items-center gap-1"
                                >
                                  {showEllipsisBefore && (
                                    <span className="text-slate-400 px-1">
                                      …
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                                      currentPage === page
                                        ? "bg-orange-500 text-white border-orange-500"
                                        : "border-white/10 bg-white/5 text-white/90 hover:bg-white/10"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-medium text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
  );
}


