"use client";

import { useQhseLoading } from "@/app/qhse/QhseLoadingContext";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { ARCHIVE_MODULES, buildArchivePayload, archiveDocument } from "../../../utils/archive";
import { ArchiveIconButton, DeleteIconButton, ViewIconButton, ApproveIconButton, RejectIconButton, DownloadIconButton } from "../../../components/ActionIcons";
import { useEffect, useState } from "react";
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

function getStatusBadge(status) {
  const map = {
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
    DRAFT: {
      label: "Draft",
      classes:
        "bg-slate-700/40 border-slate-400/60 text-slate-100",
    },
  };

  const cfg = map[status] || map.PENDING;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function EquipmentBaseStockAdminPage() {
  const { setPageLoading } = useQhseLoading();
  const { contentClassName } = useQhseSidebar();
  const initialYears = getYears();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("PENDING"); // PENDING, APPROVED, REJECTED, ALL
  const [actionId, setActionId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [downloadingDocx, setDownloadingDocx] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [year, setYear] = useState("");
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);

  const fetchForms = async () => {
    setLoading(true);
    setPageLoading(true);
    setError("");
    try {
      const url =
        year !== "" && year != null
          ? `/api/qhse/form-checklist/equipment-base-stock-level/list?year=${year}`
          : "/api/qhse/form-checklist/equipment-base-stock-level/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load forms");
      }
      setForms(data.data || []);
      if (data.years && Array.isArray(data.years) && data.years.length > 0) {
        const merged = Array.from(
          new Set([...initialYears, ...data.years])
        ).sort((a, b) => b - a);
        setAvailableYears(merged);
      }
    } catch (err) {
      setError(err.message || "Failed to load forms");
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(
          "/api/qhse/form-checklist/equipment-base-stock-level/list"
        );
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

  useEffect(() => {
    fetchForms();
  }, [year]);

  // Admin should not see drafts anywhere
  const visibleForms = forms.filter((form) => form.status !== "DRAFT");

  const filteredForms = visibleForms.filter((form) => {
    if (filter === "ALL") return true;
    return form.status === filter;
  });

  const handleApproval = async (id, nextStatus) => {
    const confirmationMessage =
      nextStatus === "APPROVED"
        ? "Are you sure you want to APPROVE this equipment base stock form?"
        : "Are you sure you want to REJECT this equipment base stock form?";

    if (!confirm(confirmationMessage)) return;

    setActionId(id);
    setError("");
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/equipment-base-stock-level/${id}/approval`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(
          data.error || data.message || "Failed to update approval status"
        );
      }
      await fetchForms();
    } catch (err) {
      setError(err.message || "Failed to update approval status");
    } finally {
      setActionId(null);
    }
  };

  const handleArchive = async (form) => {
    if (!confirm("Archive this form? It will be stored in QHSE Archive (Equipment Base Stock Level).")) return;
    setArchivingId(form._id);
    setError("");
    try {
      const title = form.serialNumber || form.formCode || form._id;
      const payload = buildArchivePayload(ARCHIVE_MODULES.EQUIPMENT_BASE_STOCK, form, title, form.formCode);
      const result = await archiveDocument(payload);
      if (!result.success) throw new Error(result.error);
      setForms((prev) => prev.filter((f) => f._id !== form._id));
    } catch (err) {
      setError(err.message || "Failed to archive");
    } finally {
      setArchivingId(null);
    }
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
    setError("");
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/equipment-base-stock-level/${form._id}/download/pdf`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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

  const handleDelete = async (form) => {
    if (!confirm("Are you sure you want to delete this form? This cannot be undone.")) return;
    setDeleting(form._id);
    setError("");
    try {
      const res = await fetch(`/api/qhse/form-checklist/equipment-base-stock-level/${form._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setForms((prev) => prev.filter((f) => f._id !== form._id));
    } catch (err) {
      setError(err.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return null;

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Header */}
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
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Equipment Base Stock – Admin Review
            </h1>
            <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-013</span>
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden flex-shrink-0">
            <Link
              href="/qhse/forms-checklist/equipment-base-stock-level/form"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Base Stock Form
            </Link>
            <Link
              href="/qhse/forms-checklist/equipment-base-stock-level/list"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Base Stock List
            </Link>
            <Link
              href="/qhse/forms-checklist/equipment-base-stock-level/admin"
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
            >
              Base Stock Admin
            </Link>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Year filter + Status filter tabs – same placement as list page */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
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
          <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((key) => {
            const labelMap = {
              PENDING: "Pending Review",
              APPROVED: "Approved",
              REJECTED: "Rejected",
              ALL: "All",
            };
            const active = filter === key;
            const base =
              "px-4 py-2 rounded-lg text-sm font-medium transition border";
            let activeClass =
              "bg-slate-700/50 text-white/80 border-sky-400/40";
            if (key === "PENDING") {
              activeClass =
                "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
            } else if (key === "APPROVED") {
              activeClass =
                "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
            } else if (key === "REJECTED") {
              activeClass =
                "bg-red-500/20 text-red-300 border-red-500/50";
            }
            const inactiveClass =
              "bg-slate-800/40 text-white/70 border-slate-500/40 hover:bg-slate-700/60";

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
        </div>

        {/* List */}
        {(() => {
          if (filteredForms.length === 0) {
            let message = "No equipment base stock forms found.";
            if (filter === "PENDING") {
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
              {filteredForms.map((form) => (
                <div
                  key={form._id}
                  className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 space-y-3 hover:border-white/20 transition"
                >
                  <div className="flex items-start justify-between gap-4">
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
                      <div className="flex flex-wrap gap-4 text-[11px] text-white/50">
                        <span>
                          Revision Date: {formatDate(form.revisionDate)}
                        </span>
                        <span>
                          Created: {formatDate(form.createdAt)} • Updated:{" "}
                          {formatDate(form.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <ViewIconButton
                        onClick={() =>
                          setExpandedId(
                            expandedId === form._id ? null : form._id
                          )}
                        title={expandedId === form._id ? "Hide details" : "View details"}
                      />
                      <DownloadIconButton
                        onClick={() => handleDownloadDocx(form)}
                        disabled={
                          downloadingDocx === form._id ||
                          downloadingPdf === form._id
                        }
                        loading={downloadingDocx === form._id}
                        title="Download as Word"
                      />
                      <DownloadIconButton
                        onClick={() => handleDownloadPdf(form)}
                        disabled={
                          downloadingPdf === form._id ||
                          downloadingDocx === form._id
                        }
                        loading={downloadingPdf === form._id}
                        title="Download as PDF"
                        className="!text-rose-400 hover:!text-rose-300"
                      />
                      {form.status === "PENDING" && (
                        <>
                          <ApproveIconButton
                            onClick={() => handleApproval(form._id, "APPROVED")}
                            disabled={actionId === form._id}
                            loading={actionId === form._id}
                          />
                          <RejectIconButton
                            onClick={() => handleApproval(form._id, "REJECTED")}
                            disabled={actionId === form._id}
                            loading={actionId === form._id}
                          />
                        </>
                      )}
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
                  </div>

                  {expandedId === form._id && (
                    <div className="border-t border-white/10 pt-3 space-y-3 text-sm text-white/80">
                      {Array.isArray(form.equipmentCategories) &&
                      form.equipmentCategories.length > 0 ? (
                        form.equipmentCategories.map((cat, idx) => (
                          <div
                            key={`${cat.categoryName || "cat"}-${idx}`}
                            className="rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="px-4 py-2 bg-amber-100/70 text-slate-900 text-xs font-semibold flex justify-between">
                              <span>
                                {cat.categoryName || "Category"}
                                {cat.subCategory ? ` – ${cat.subCategory}` : ""}
                              </span>
                              <span className="text-[10px] text-slate-800">
                                Items: {cat.items?.length || 0}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-white/10 text-white/80">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold">
                                      Equipment
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold">
                                      In Use
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold">
                                      Spare
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold">
                                      Comments
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold">
                                      Condition
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(cat.items || []).map((item, itemIdx) => (
                                    <tr
                                      key={`${cat.categoryName || "cat"}-${
                                        item?.name || "item"
                                      }-${itemIdx}`}
                                      className="border-t border-white/5"
                                    >
                                      <td className="px-3 py-2 text-white/90">
                                        {item?.name || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-white/80">
                                        {item?.quantityInUse ?? "—"}
                                      </td>
                                      <td className="px-3 py-2 text-center text-white/80">
                                        {item?.quantitySpare ?? "—"}
                                      </td>
                                      <td className="px-3 py-2 text-white/70">
                                        {item?.additionalComments || "—"}
                                      </td>
                                      <td className="px-3 py-2 text-white/80">
                                        {item?.overallCondition || "Not Assessed"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-white/60 text-xs">
                          No equipment details provided.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}


