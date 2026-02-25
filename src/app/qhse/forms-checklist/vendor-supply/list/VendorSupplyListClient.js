"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditIconButton, ViewIconButton } from "../../../components/ActionIcons";

/* ---------------- helpers ---------------- */

// Generate dynamic years: 2 years back, current year, and 5 years forward
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  // 2 years in the past
  for (let i = currentYear - 2; i < currentYear; i++) {
    years.push(i);
  }
  // Current year and 5 years forward
  for (let i = currentYear; i <= currentYear + 5; i++) {
    years.push(i);
  }
  return years;
}

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
    DRAFT: "bg-slate-700/40 border-slate-400/60 text-slate-100",
    UNDER_REVIEW: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
    APPROVED: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    REJECTED: "bg-red-500/20 border-red-500/50 text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        map[status] || map.DRAFT
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

/* ---------------- component ---------------- */

export default function VendorSupplyListClient() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState("");
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [filter, setFilter] = useState("DRAFT");
  const [selectedForm, setSelectedForm] = useState(null);

  const fetchForms = async () => {
    setLoading(true);
    setError("");
    try {
      const url = year !== "" && year != null
        ? `/api/qhse/form-checklist/vendor-supply-form/list?year=${year}`
        : "/api/qhse/form-checklist/vendor-supply-form/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load forms");
      setForms(data.data || []);
      // Update selected form if it exists
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

  const filteredForms =
    filter === "ALL" ? forms : forms.filter((form) => form.status === filter);

  const handleEdit = (id) => {
    router.push(
      `/qhse/forms-checklist/vendor-supply/form?edit=${id}&from=list`
    );
  };

  const handleSubmitForm = async (id) => {
    if (!confirm("Submit this form for review?")) return;

    setSubmittingId(id);
    try {
      const res = await fetch(
        `/api/qhse/form-checklist/vendor-supply-form/${id}/update`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "UNDER_REVIEW" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      await fetchForms();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className={`${contentClassName} flex items-center justify-center`}>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / Forms & Checklist / Vendor & Supplier
            </p>
            <h1 className="text-2xl font-bold text-white">
              Vendor / Supplier Approval – Forms
            </h1>
              <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-037</span>
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap ml-auto">
            <div className="flex items-center gap-3">
              <a
                href="/templates/controlled-register/QAF-OFD-037.xlsx"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                title="Download form template (QAF-OFD-037)"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                </svg>
                Template
              </a>
            </div>
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
              >
                <option value="">All years</option>
                {getYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
            <Link
              href="/qhse/forms-checklist/vendor-supply/form"
              className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Vendor Form
            </Link>
            <Link
              href="/qhse/forms-checklist/vendor-supply/list"
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
            >
              Vendor List
            </Link>
            <Link
              href="/qhse/forms-checklist/vendor-supply/admin"
              className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Vendor Admin
            </Link>
          </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ALL"].map(
            (key) => {
              const labelMap = {
                DRAFT: "Draft",
                UNDER_REVIEW: "Under Review",
                APPROVED: "Approved",
                REJECTED: "Rejected",
                ALL: "All",
              };
              const active = filter === key;
              const base =
                "px-4 py-2 rounded-lg text-sm font-medium transition border";
              const activeClass =
                key === "DRAFT"
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                  : key === "UNDER_REVIEW"
                  ? "bg-sky-500/20 text-sky-300 border-sky-500/50"
                  : key === "APPROVED"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  : key === "REJECTED"
                  ? "bg-red-500/20 text-red-300 border-red-500/50"
                  : "bg-slate-700/50 text-white/80 border-sky-400/40";
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
            }
          )}
        </div>

        {/* List */}
        {filteredForms.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/60 text-sm">
              {filter === "DRAFT"
                ? "No draft forms found."
                : filter === "UNDER_REVIEW"
                ? "No forms under review."
                : filter === "APPROVED"
                ? "No approved forms."
                : filter === "REJECTED"
                ? "No rejected forms."
                : "No vendor approval forms found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Detail Card - Show when form is selected */}
            {selectedForm && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Form Details
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedForm.formCode || selectedForm.formNo || "N/A"}
                      {selectedForm.serialNumber && ` • ${selectedForm.serialNumber}`}
                      {" • Year: "}{selectedForm.year ?? "N/A"}
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

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    {getStatusBadge(selectedForm.status)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Form Code</p>
                    <p className="text-sm text-white">{selectedForm.formCode || selectedForm.formNo || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Serial</p>
                    <p className="text-sm text-white font-mono">{selectedForm.serialNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Vendor Name</p>
                    <p className="text-sm text-white">{selectedForm.vendorName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Vendor Address</p>
                    <p className="text-sm text-white">{selectedForm.vendorAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Date</p>
                    <p className="text-sm text-white">{formatDate(selectedForm.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Year</p>
                    <p className="text-sm text-white">{selectedForm.year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Requested By</p>
                    <p className="text-sm text-white">{selectedForm.requestedBy || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">For Accounts (Sign)</p>
                    <p className="text-sm text-white">{selectedForm.forAccountsSign || "—"}</p>
                  </div>
                </div>

                {/* Ratings and Scores */}
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <h3 className="text-base font-semibold text-white">Ratings & Scores</h3>
                  
                  {/* Supply of Parts */}
                  <div className="rounded-xl border border-white/10 p-4 space-y-3" style={{ backgroundColor: '#153d59' }}>
                    <h4 className="text-sm font-semibold text-white">For Supply of Parts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Technical Comparison</p>
                        <p className="text-white">{selectedForm.supplyOfParts?.technicalComparison || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Commercial Comparison</p>
                        <p className="text-white">{selectedForm.supplyOfParts?.commercialComparison || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Legal Entity</p>
                        <p className="text-white">{selectedForm.supplyOfParts?.legalEntityForServiceOrSupply || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Agrees to Oceane Terms</p>
                        <p className="text-white">{selectedForm.supplyOfParts?.agreesToOceaneTerms || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Infrastructure & Facilities</p>
                        <p className="text-white">{selectedForm.supplyOfParts?.infrastructureAndFacilities || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Previous Experience</p>
                        <p className="text-white">{selectedForm.supplyOfParts?.previousExperienceExpertise || "—"}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-1">Parts Percentage Score</p>
                      <p className="text-lg font-bold text-sky-300">
                        {selectedForm.supplyOfParts?.percentageScore || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Supply of Services */}
                  <div className="rounded-xl border border-white/10 p-4 space-y-3" style={{ backgroundColor: '#153d59' }}>
                    <h4 className="text-sm font-semibold text-white">For Supply of Services</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Skilled Manpower Availability</p>
                        <p className="text-white">{selectedForm.supplyOfServices?.skilledManpowerAvailability || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Contractor Certifications</p>
                        <p className="text-white">{selectedForm.supplyOfServices?.contractorCertifications || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">HSE System / Due Diligence</p>
                        <p className="text-white">{selectedForm.supplyOfServices?.hseSystemDueDiligence || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Insurance & Work Permit</p>
                        <p className="text-white">{selectedForm.supplyOfServices?.insuranceAndWorkPermit || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Previous Experience (Years)</p>
                        <p className="text-white">{selectedForm.supplyOfServices?.previousExperienceYears || "—"}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-1">Services Percentage Score</p>
                      <p className="text-lg font-bold text-sky-300">
                        {selectedForm.supplyOfServices?.percentageScore || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Overall Result */}
                  <div className="rounded-xl border border-sky-500/40 bg-sky-900/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-sky-200">Overall Percentage Score</p>
                        <p className="text-sm text-slate-200 mt-1">
                          {selectedForm.approvedVendorEligible
                            ? "Vendor is eligible for approval (≥80%)"
                            : "Vendor needs improvement (<80%)"}
                        </p>
                      </div>
                      <p
                        className={`text-3xl font-extrabold ${
                          selectedForm.overallPercentageScore >= 80
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }`}
                      >
                        {selectedForm.overallPercentageScore || 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {selectedForm.approvedBy && (
                  <div className="border-t border-white/10 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Approved By</p>
                        <p className="text-sm text-white">{selectedForm.approvedBy}</p>
                      </div>
                      {selectedForm.approvedAt && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Approved At</p>
                          <p className="text-sm text-white">{formatDate(selectedForm.approvedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedForm.rejectionReason && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs text-slate-400 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-300">{selectedForm.rejectionReason}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedForm.status === "DRAFT" && (
                  <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForm(null);
                        handleEdit(selectedForm._id);
                      }}
                      className="px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-white/90 hover:bg-white/20 transition text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSubmitForm(selectedForm._id);
                        setSelectedForm(null);
                      }}
                      disabled={submittingId === selectedForm._id}
                      className="px-6 py-2.5 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingId === selectedForm._id ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* List View - Hidden when detail card is shown */}
            {!selectedForm && (
              <div className="space-y-4">
                {filteredForms.map((form) => (
                  <div
                    key={form._id}
                    className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 flex items-center justify-between gap-4 hover:border-white/20 transition"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-sm font-semibold text-white/90 truncate max-w-sm">
                          {form.vendorName || "Unnamed Vendor"}
                        </h2>
                        {getStatusBadge(form.status)}
                        {(form.formCode || form.formNo) && (
                          <span className="text-xs font-mono text-sky-300">
                            {form.formCode || form.formNo}
                          </span>
                        )}
                        {form.serialNumber && (
                          <span className="text-xs font-mono text-white/80">
                            {form.serialNumber}
                          </span>
                        )}
                        {typeof form.overallPercentageScore === "number" && (
                          <span className="text-xs text-sky-300 font-semibold">
                            Overall Score: {form.overallPercentageScore}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/60 line-clamp-1">
                        {form.vendorAddress || "No address provided"}
                      </p>
                      <div className="flex gap-4 text-[11px] text-white/50">
                        <span>Date: {formatDate(form.date)}</span>
                        <span>
                          Created: {formatDate(form.createdAt)} • Updated:{" "}
                          {formatDate(form.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ViewIconButton onClick={() => setSelectedForm(form)} />
                      {form.status === "DRAFT" && (
                        <>
                          <EditIconButton onClick={() => handleEdit(form._id)} />
                          <button
                            type="button"
                            onClick={() => handleSubmitForm(form._id)}
                            disabled={submittingId === form._id}
                            className="px-4 py-2 rounded-full text-xs font-semibold border border-sky-400/60 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {submittingId === form._id ? "Submitting..." : "Submit"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
