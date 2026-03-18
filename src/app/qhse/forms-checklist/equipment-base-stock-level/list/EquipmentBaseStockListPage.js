"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditIconButton, DownloadIconButton, ViewIconButton } from "../../../components/ActionIcons";
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

function getStatusBadge(status) {
  const map = {
    DRAFT: {
      label: "Draft",
      classes:
        "bg-slate-700/40 border-slate-400/60 text-slate-100",
    },
    PENDING: {
      label: "Pending Review",
      classes:
        "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
    },
    APPROVED: {
      label: "Approved",
      classes:
        "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    },
    REJECTED: {
      label: "Rejected",
      classes: "bg-red-500/20 border-red-500/50 text-red-300",
    },
  };

  const cfg = map[status] || map.DRAFT;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.classes}`}
    >
      {cfg.label}
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

export default function EquipmentBaseStockListPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingDocx, setDownloadingDocx] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formToReject, setFormToReject] = useState(null);
  const [filter, setFilter] = useState("DRAFT"); // DRAFT, APPROVED, REJECTED, ALL
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/form-checklist/equipment-base-stock-level/list");
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
    setError("");
    try {
      const url = year !== "" && year != null
        ? `/api/qhse/form-checklist/equipment-base-stock-level/list?year=${year}`
        : "/api/qhse/form-checklist/equipment-base-stock-level/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load forms");
      }
      setForms(data.data || []);
      if (selectedForm) {
        const updated = (data.data || []).find((f) => f._id === selectedForm._id);
        if (updated) setSelectedForm(updated);
      }
    } catch (err) {
      setError(err.message || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [year]);

  const filteredForms = forms.filter((form) => {
    if (filter === "ALL") return true;
    if (filter === "DRAFT") return form.status === "DRAFT";
    if (filter === "PENDING") return form.status === "PENDING";
    if (filter === "APPROVED") return form.status === "APPROVED";
    if (filter === "REJECTED") return form.status === "REJECTED";
    return false;
  });

  const handleEdit = (id) => {
    router.push(
      `/qhse/forms-checklist/equipment-base-stock-level/form?edit=${id}&from=list`
    );
  };

  const handleDownloadDocx = async (form) => {
    setDownloadingDocx(form._id);
    setError("");
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/equipment-base-stock-level/${form._id}/download`
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download document");
      }
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STS-Equipment-Base-Stock-${form.serialNumber || form._id}.docx`;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download document");
    } finally {
      setDownloadingDocx(null);
    }
  };

  const handleDownloadPdf = async (form) => {
    setDownloadingPdf(form._id);
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/equipment-base-stock-level/${form._id}/download/pdf`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 501) {
          alert("PDF download will be available soon.");
          return;
        }
        throw new Error(data.error || "Failed to download PDF");
      }
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STS-Equipment-Base-Stock-${form.serialNumber || form._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm("Are you sure you want to approve this form?")) return;
    setApprovingId(id);
    setError("");
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/equipment-base-stock-level/${id}/approval`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED", approvedBy: "admin" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      await fetchForms();
      if (selectedForm && selectedForm._id === id && data.data) setSelectedForm(data.data);
      alert("Form approved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectModal = (form) => {
    setFormToReject(form);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!formToReject) return;
    setRejectingId(formToReject._id);
    setError("");
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/equipment-base-stock-level/${formToReject._id}/approval`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "REJECTED",
            rejectionReason: rejectionReason.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      setShowRejectModal(false);
      setFormToReject(null);
      setRejectionReason("");
      await fetchForms();
      if (selectedForm && selectedForm._id === formToReject._id && data.data) setSelectedForm(data.data);
      alert("Form rejected.");
    } catch (err) {
      setError(err.message);
    } finally {
      setRejectingId(null);
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
              QHSE / Forms & Checklist / STS Equipment Base Stock Level
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">My Equipment Base Stock Forms</h1>
              <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-013</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="/templates/controlled-register/QAF-OFD-013.docx"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
              title="Download form template (QAF-OFD-013)"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
              </svg>
              Template
            </a>
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/forms-checklist/equipment-base-stock-level/form"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Base Stock Form
              </Link>
              <Link
                href="/qhse/forms-checklist/equipment-base-stock-level/list"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Base Stock List
              </Link>
              <Link
                href="/qhse/forms-checklist/equipment-base-stock-level/admin"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Base Stock Admin
              </Link>
            </div>
          </div>
        </header>
        <QhseListPageContainer
            searchPlaceholder="Search by Serial, Form Code..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filterChildren={
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
                <select
                  className="theme-select rounded-full px-3 py-1.5 text-xs tracking-widest uppercase"
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
              <div className="flex gap-2 flex-wrap">
                {["DRAFT", "PENDING", "APPROVED", "REJECTED", "ALL"].map((key) => {
                  const labelMap = {
                    DRAFT: "Draft",
                    PENDING: "Pending Review",
                    APPROVED: "Approved",
                    REJECTED: "Rejected",
                    ALL: "All",
                  };
                  const active = filter === key;
                  const base = "px-4 py-2 rounded-lg text-sm font-medium transition border";
                  let activeClass = "bg-slate-700/50 text-white/80 border-sky-400/40";
                  if (key === "DRAFT") activeClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
                  else if (key === "PENDING") activeClass = "bg-sky-500/20 text-sky-300 border-sky-500/50";
                  else if (key === "APPROVED") activeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
                  else if (key === "REJECTED") activeClass = "bg-red-500/20 text-red-300 border-red-500/50";
                  const inactiveClass = "bg-slate-800/40 text-white/70 border-slate-500/40 hover:bg-slate-700/60";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`${base} ${active ? activeClass : inactiveClass}`}
                    >
                      {labelMap[key]}
                    </button>
                  );
                })}
              </div>
            </>
          }
        >
          {error && (
            <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

        {/* Detail card (when View is opened) */}
        {selectedForm && (
          <div className="bg-white/5 border border-white/15 rounded-xl overflow-hidden mb-6">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-mono font-semibold text-sky-300">
                  {selectedForm.formCode || "QAF-OFD-013"}
                </span>
                <span className="text-sm text-white/80">{selectedForm.serialNumber || "—"}</span>
                {getStatusBadge(selectedForm.status)}
              </div>
              <div className="flex items-center gap-2">
                <DownloadIconButton
                  onClick={() => handleDownloadDocx(selectedForm)}
                  disabled={downloadingDocx === selectedForm._id}
                  loading={downloadingDocx === selectedForm._id}
                  title="Download as Word"
                />
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedForm)}
                  disabled={downloadingPdf === selectedForm._id}
                  title="Download as PDF"
                  className="p-1.5 rounded text-slate-400 hover:text-slate-300 hover:bg-white/10 inline-flex disabled:opacity-50"
                  aria-label="Download as PDF"
                >
                  {downloadingPdf === selectedForm._id ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                {selectedForm.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => openRejectModal(selectedForm)}
                      disabled={rejectingId === selectedForm._id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-400/50 bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      {rejectingId === selectedForm._id ? "Rejecting…" : "Reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedForm._id)}
                      disabled={approvingId === selectedForm._id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-emerald-400/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      {approvingId === selectedForm._id ? "Approving…" : "Approve"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedForm(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-400">Year</span><br /><span className="text-white/90">{selectedForm.year ?? "—"}</span></div>
                <div><span className="text-slate-400">Version</span><br /><span className="text-white/90">{selectedForm.version ?? "—"}</span></div>
                <div><span className="text-slate-400">Revision Date</span><br /><span className="text-white/90">{formatDate(selectedForm.revisionDate)}</span></div>
                <div><span className="text-slate-400">Created</span><br /><span className="text-white/90">{formatDate(selectedForm.createdAt)}</span></div>
                <div><span className="text-slate-400">Updated</span><br /><span className="text-white/90">{formatDate(selectedForm.updatedAt)}</span></div>
              </div>
              {selectedForm.filledBy && (
                <div>
                  <span className="text-slate-400 text-sm">Filled by</span>
                  <p className="text-white/90 text-sm mt-0.5">
                    {selectedForm.filledBy.name ?? "—"}
                    {selectedForm.filledBy.roleAtSubmission && (
                      <span className="text-slate-400"> • {selectedForm.filledBy.roleAtSubmission}</span>
                    )}
                  </p>
                </div>
              )}
              {selectedForm.approvedBy && (selectedForm.approvedBy.name || selectedForm.approvedBy.designation) && (
                <div>
                  <span className="text-slate-400 text-sm">Approved by</span>
                  <p className="text-white/90 text-sm mt-0.5">
                    {selectedForm.approvedBy.name ?? "—"}
                    {selectedForm.approvedBy.designation && (
                      <span className="text-slate-400"> • {selectedForm.approvedBy.designation}</span>
                    )}
                    {selectedForm.approvedBy.approvedDate && (
                      <span className="text-slate-400"> • {formatDate(selectedForm.approvedBy.approvedDate)}</span>
                    )}
                  </p>
                </div>
              )}
              {Array.isArray(selectedForm.equipmentCategories) && selectedForm.equipmentCategories.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-sky-300">Equipment categories</h3>
                  {selectedForm.equipmentCategories.map((cat, idx) => (
                    <div key={idx} className="border border-white/10 rounded-lg p-4 bg-white/5">
                      <div className="text-sm font-medium text-white/90 mb-2">
                        {cat.categoryName}
                        {cat.subCategory && <span className="text-slate-400 font-normal"> • {cat.subCategory}</span>}
                      </div>
                      {Array.isArray(cat.items) && cat.items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-white/10">
                                <th className="text-left py-2 pr-2">Item</th>
                                <th className="text-left py-2 pr-2">Qty in use</th>
                                <th className="text-left py-2 pr-2">Qty spare</th>
                                <th className="text-left py-2 pr-2">Condition</th>
                                <th className="text-left py-2">Comments</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.items.map((item, i) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-1.5 pr-2 text-white/90">{item.name ?? "—"}</td>
                                  <td className="py-1.5 pr-2 text-white/80">{item.quantityInUse ?? "—"}</td>
                                  <td className="py-1.5 pr-2 text-white/80">{item.quantitySpare ?? "—"}</td>
                                  <td className="py-1.5 pr-2 text-white/80">{item.overallCondition ?? "—"}</td>
                                  <td className="py-1.5 text-white/70">{item.additionalComments ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs">No items</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* List */}
        {!selectedForm && (() => {
          const searchFiltered = !searchTerm.trim()
            ? filteredForms
            : filteredForms.filter((f) => {
                const s = searchTerm.toLowerCase();
                return (f.serialNumber || "").toLowerCase().includes(s) || (f.formCode || "").toLowerCase().includes(s);
              });
          if (searchFiltered.length === 0) {
            let message = "No equipment base stock forms found.";
            if (filter === "DRAFT") {
              message = "No draft forms found.";
            } else if (filter === "PENDING") {
              message = "No forms pending review.";
            } else if (filter === "APPROVED") {
              message = "No approved forms.";
            } else if (filter === "REJECTED") {
              message = "No rejected forms.";
            }
            return (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <p className="text-white/60 text-sm">{message}</p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {searchFiltered.map((form) => (
                <div
                  key={form._id}
                  className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 flex items-center justify-between gap-4 hover:border-white/20 transition"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-400">Form code:</span>
                      <span className="text-sm font-mono font-semibold text-sky-300">
                        {form.formCode || "QAF-OFD-013"}
                      </span>
                      <span className="text-xs text-slate-400">Serial:</span>
                      <span className="text-sm font-mono text-white/90">
                        {form.serialNumber || "—"}
                      </span>
                      {getStatusBadge(form.status)}
                    </div>
                    <div className="flex gap-4 text-[11px] text-white/50 flex-wrap">
                      <span>Revision Date: {formatDate(form.revisionDate)}</span>
                      <span>
                        Created: {formatDate(form.createdAt)} • Updated:{" "}
                        {formatDate(form.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ViewIconButton
                      onClick={() => setSelectedForm(form)}
                      title="View"
                    />
                    <DownloadIconButton
                      onClick={() => handleDownloadDocx(form)}
                      disabled={downloadingDocx === form._id}
                      loading={downloadingDocx === form._id}
                      title="Download as Word"
                    />
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(form)}
                      disabled={downloadingPdf === form._id}
                      title="Download as PDF"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-300 hover:bg-white/10 inline-flex disabled:opacity-50"
                      aria-label="Download as PDF"
                    >
                      {downloadingPdf === form._id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    {form.status === "DRAFT" && (
                      <EditIconButton
                        onClick={() => handleEdit(form._id)}
                        title="Edit Draft"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        </QhseListPageContainer>

        {/* Reject modal */}
        {showRejectModal && formToReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true" aria-labelledby="reject-modal-title">
            <div className="bg-slate-800 border border-white/15 rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 id="reject-modal-title" className="text-lg font-semibold text-white mb-4">Reject form</h2>
              <p className="text-slate-300 text-sm mb-3">
                Form: {formToReject.formCode || "QAF-OFD-013"} • {formToReject.serialNumber || "—"}
              </p>
              <label className="block text-sm text-slate-400 mb-1">Reason (optional)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 text-white px-3 py-2 text-sm min-h-[80px] resize-y"
                placeholder="Enter rejection reason…"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setFormToReject(null);
                    setRejectionReason("");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejectingId === formToReject._id}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-400/50 hover:bg-red-500/30 disabled:opacity-50"
                >
                  {rejectingId === formToReject._id ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


