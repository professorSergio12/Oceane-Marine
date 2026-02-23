"use client";

import { useEffect, useState } from "react";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

// Calculate AGE in years from firstUseDate or dateOfPurchase
function calculateAge(firstUseDate, dateOfPurchase) {
  const startDate = firstUseDate ? new Date(firstUseDate) : (dateOfPurchase ? new Date(dateOfPurchase) : null);
  if (!startDate || Number.isNaN(startDate.getTime())) return null;
  const now = new Date();
  const diffTime = Math.abs(now - startDate);
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return diffYears.toFixed(2);
}

// Calculate Days Remaining until nextTestDate
function calculateDaysRemaining(nextTestDate) {
  if (!nextTestDate) return null;
  const testDate = new Date(nextTestDate);
  if (Number.isNaN(testDate.getTime())) return null;
  const now = new Date();
  const diffTime = testDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function PrimaryEquipment({ activeTab: controlledActiveTab, onChangeTab }) {
  // Allow parent to control active tab; fall back to internal state if not provided
  const [internalActiveTab, setInternalActiveTab] = useState("form");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onChangeTab ?? setInternalActiveTab;

  // ----- Form state -----
  const [form, setForm] = useState({
    equipmentCode: "",
    equipmentName: "",
    equipmentType: "",
    specification: "",
    manufacturer: "",
    yearOfManufacturing: "",
    ownershipType: "OWNED",
    dateOfPurchase: "",
    firstUseDate: "",
    lastTestDate: "",
    nextTestDate: "",
    retirementPeriodYears: 10,
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // ----- History state -----
  const [equipments, setEquipments] = useState([]);
  const [equipmentsLoading, setEquipmentsLoading] = useState(false);
  const [equipmentsError, setEquipmentsError] = useState(null);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // List tab detail view state
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState(null);

  // Load equipments list when list or history tab first opened
  useEffect(() => {
    if ((activeTab === "list" || activeTab === "history") && equipments.length === 0 && !equipmentsLoading) {
      fetchEquipments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchEquipments = async () => {
    setEquipmentsLoading(true);
    setEquipmentsError(null);
    try {
      const res = await fetch(
        "/api/pms/equipment-inventory/primary-equipment/list"
      );

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned an invalid response. Please try again.");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to load equipments");
      }
      setEquipments(data.equipments || []);
    } catch (err) {
      console.error("Fetch equipments error:", err);
      setEquipmentsError(err.message || "Failed to load equipments");
    } finally {
      setEquipmentsLoading(false);
    }
  };

  const fetchHistory = async (equipment) => {
    if (!equipment?._id) return;

    setSelectedEquipmentId(equipment._id);
    setSelectedEquipment(equipment);
    setHistory([]);
    setHistoryMeta(null);
    setHistoryError(null);
    setHistoryLoading(true);

    try {
      const res = await fetch(
        `/api/pms/equipment-inventory/primary-equipment/${equipment._id}/history`
      );

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned an invalid response. Please try again.");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to load equipment history");
      }

      // New API shape: { equipmentId, totalJobs, records: [...] }
      setHistory(data.records || []);
      setHistoryMeta({
        equipmentId: data.equipmentId,
        totalJobs: data.totalJobs || 0,
      });
      // Clear error if we got a successful response (even if empty)
      setHistoryError(null);
    } catch (err) {
      console.error("Fetch history error:", err);
      // Only show error if it's not a "no records" case
      if (err.message && !err.message.includes("Invalid equipment id")) {
        setHistoryError(err.message || "Failed to load equipment history");
      } else {
        setHistoryError(null);
        setHistory([]);
        setHistoryMeta({ equipmentId: equipment._id, totalJobs: 0 });
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload = {
        ...form,
        yearOfManufacturing:
          form.yearOfManufacturing === ""
            ? undefined
            : Number(form.yearOfManufacturing),
        retirementPeriodYears:
          form.retirementPeriodYears === ""
            ? undefined
            : Number(form.retirementPeriodYears),
        dateOfPurchase: form.dateOfPurchase || undefined,
        firstUseDate: form.firstUseDate || undefined,
        lastTestDate: form.lastTestDate || undefined,
        nextTestDate: form.nextTestDate || undefined,
      };

      const res = await fetch(
        "/api/pms/equipment-inventory/primary-equipment/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create equipment");
      }

      setFormSuccess("Equipment created successfully");
      setFormError(null);
      // Reset form except ownershipType and retirement period
      setForm((prev) => ({
        ...prev,
        equipmentCode: "",
        equipmentName: "",
        equipmentType: "",
        specification: "",
        manufacturer: "",
        yearOfManufacturing: "",
        dateOfPurchase: "",
        firstUseDate: "",
        lastTestDate: "",
        nextTestDate: "",
        remarks: "",
      }));

      // Refresh equipments list so list and history tabs are up to date
      if (activeTab === "list" || activeTab === "history") {
        fetchEquipments();
      }
    } catch (err) {
      setFormError(err.message || "Failed to create equipment");
      setFormSuccess(null);
    } finally {
      setSubmitting(false);
      // Auto-scroll to top of card for messages
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Section header (tabs are now rendered in parent PMS header) */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
          PMS / Equipment Inventory
        </p>
        <h2 className="text-xl font-bold text-white mt-1">Primary Equipment</h2>
        <p className="text-xs text-slate-200 mt-1">
          Manage primary equipment master data and view operation history.
        </p>
      </div>

      {/* Feedback messages for form */}
      {activeTab === "form" && (formError || formSuccess) && (
        <div>
          {formError && (
            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
              {formSuccess}
            </div>
          )}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "list" && (
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-white">
              Equipment List
            </h3>
            <button
              type="button"
              onClick={fetchEquipments}
              disabled={equipmentsLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-sky-400/40 text-sky-200 hover:bg-sky-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {equipmentsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {equipmentsError && (
            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-100">
              {equipmentsError}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 bg-white/5">
              Primary Equipments
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-white/10 bg-white/5">
                    <th className="px-4 py-2 font-semibold">Code</th>
                    <th className="px-4 py-2 font-semibold">Name</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Ownership</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 font-semibold">In Use</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipments.length === 0 && !equipmentsLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-4 text-center text-slate-400"
                      >
                        No equipments found
                      </td>
                    </tr>
                  )}
                  {equipments.map((eq) => (
                    <tr
                      key={eq._id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-4 py-2 font-mono text-sky-300">
                        {eq.equipmentCode}
                      </td>
                      <td className="px-4 py-2 text-slate-100">
                        {eq.equipmentName}
                      </td>
                      <td className="px-4 py-2 text-slate-200">
                        {eq.equipmentType}
                      </td>
                      <td className="px-4 py-2 text-slate-200">
                        {eq.ownershipType}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${eq.status === "ACTIVE"
                              ? "bg-emerald-500/10 border-emerald-400/60 text-emerald-200"
                              : eq.status === "RETIRED"
                                ? "bg-slate-500/10 border-slate-400/60 text-slate-200"
                                : "bg-amber-500/10 border-amber-400/60 text-amber-200"
                            }`}
                        >
                          {eq.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {eq.isInUse ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 border border-emerald-400/60">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEquipmentDetail(eq)}
                          className="text-xs px-3 py-1 rounded-lg border border-sky-400/40 text-sky-200 hover:bg-sky-500/10 hover:border-sky-400/60 transition"
                        >
                          View More
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail View Card - Right Side */}
          {selectedEquipmentDetail && (
            <div className="relative self-center-safe inset-0 z-30 flex justify-center  pt-10 pb-30">
             <div className="relative w-full max-w-[1200px] h-[110vh] flex flex-col rounded-3xl border border-sky-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_20px_60px_rgba(0,0,0,0.75)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-6 bg-slate-950/80 backdrop-blur-md flex-shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEquipmentDetail(null)}
                        className="text-sky-300 hover:text-sky-200 transition"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-sky-300">
                        Dashboard
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-white">
                        {selectedEquipmentDetail.equipmentCode || "Equipment Details"}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Type: <span className="text-slate-200">{selectedEquipmentDetail.equipmentType || "—"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status pill */}
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border ${selectedEquipmentDetail.status === "ACTIVE"
                          ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200"
                          : selectedEquipmentDetail.status === "RETIRED"
                            ? "bg-slate-500/20 border-slate-400/60 text-slate-200"
                            : "bg-amber-500/20 border-amber-400/60 text-amber-200"
                        }`}
                    >
                      {selectedEquipmentDetail.status}
                    </span>

                    {/* Ownership */}
                    <div className="rounded-full bg-slate-800/90 px-3 py-1 text-[11px] text-slate-100 border border-white/10">
                      Ownership:{" "}
                      <span className="font-semibold">
                        {selectedEquipmentDetail.ownershipType === "OWNED" ? "Owned" : "Third Party"}
                      </span>
                    </div>

                    {/* In use indicator */}
                    {selectedEquipmentDetail.isInUse && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-200 border border-emerald-400/60">
                        In Operations
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedEquipmentDetail(null)}
                      className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-white/10 transition"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
                  {/* Top grid: basic info */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[11px] text-slate-400">Equipment Code</p>
                          <p className="font-semibold text-white">
                            {selectedEquipmentDetail.equipmentCode || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Equipment Name</p>
                          <p className="font-semibold text-white">
                            {selectedEquipmentDetail.equipmentName || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Equipment Type</p>
                          <p className="text-slate-100">
                            {selectedEquipmentDetail.equipmentType || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Specification</p>
                          <p className="text-slate-100 break-words">
                            {selectedEquipmentDetail.specification || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Manufacturer</p>
                          <p className="text-slate-100">
                            {selectedEquipmentDetail.manufacturer || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Year of Manufacturing</p>
                          <p className="text-slate-100">
                            {selectedEquipmentDetail.yearOfManufacturing || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Quantity Transferred</p>
                          <p className="text-slate-100">
                            {selectedEquipmentDetail.quantityTransferred || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lifecycle / dates */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Lifecycle & Dates
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[11px] text-slate-400">Date of Purchase</p>
                          <p className="text-slate-100">
                            {formatDate(selectedEquipmentDetail.dateOfPurchase)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">First Use Date</p>
                          <p className="text-slate-100">
                            {formatDate(selectedEquipmentDetail.firstUseDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Last Test Date</p>
                          <p className="text-slate-100">
                            {formatDate(selectedEquipmentDetail.lastTestDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Next Test Date</p>
                          <p className="text-slate-100">
                            {formatDate(selectedEquipmentDetail.nextTestDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Retirement Period</p>
                          <p className="text-slate-100">
                            {selectedEquipmentDetail.retirementPeriodYears || 10} years
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Date to be Retired</p>
                          <p className="text-slate-100">
                            {formatDate(selectedEquipmentDetail.dateToBeRetired)}
                          </p>
                        </div>
                        {selectedEquipmentDetail.lastUsedAt && (
                          <div>
                            <p className="text-[11px] text-slate-400">Last Used At</p>
                            <p className="text-slate-100">
                              {formatDateTime(selectedEquipmentDetail.lastUsedAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Calculated metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 shadow-inner">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200 mb-2">
                        Age
                      </p>
                      <p className="text-3xl font-bold text-sky-100">
                        {(() => {
                          const age = calculateAge(
                            selectedEquipmentDetail.firstUseDate,
                            selectedEquipmentDetail.dateOfPurchase
                          );
                          return age ? `${age} years` : "—";
                        })()}
                      </p>
                      <p className="mt-1 text-[11px] text-sky-100/80">
                        Based on first-use or purchase date.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 shadow-inner">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200 mb-2">
                        Days Remaining (Next Test)
                      </p>
                      <p className="text-3xl font-bold text-emerald-100">
                        {(() => {
                          const days = calculateDaysRemaining(
                            selectedEquipmentDetail.nextTestDate
                          );
                          return days !== null ? `${days} days` : "—";
                        })()}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-100/80">
                        Calculated from today to the planned next test date.
                      </p>
                    </div>
                  </div>

                  {/* Certificates */}
                  {selectedEquipmentDetail.certificates &&
                    selectedEquipmentDetail.certificates.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                          Certificates
                        </h4>
                        <div className="space-y-2">
                          {selectedEquipmentDetail.certificates.map((cert, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <div className="flex-1">
                                <p className="text-xs font-medium text-slate-100">
                                  Certificate {idx + 1}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Uploaded: {formatDateTime(cert.uploadedAt)}
                                </p>
                              </div>
                              {cert.fileUrl && (
                                <a
                                  href={cert.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-lg bg-yellow-500/20 px-3 py-1.5 text-[11px] font-semibold text-yellow-100 border border-yellow-400/50 hover:bg-yellow-500/30 transition"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                  View / Download
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Remarks */}
                  {selectedEquipmentDetail.remarks && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Remarks
                      </h4>
                      <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-50">
                        {selectedEquipmentDetail.remarks}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="border-t border-white/10 bg-slate-950/80 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEquipmentDetail(null);
                      setActiveTab("history");
                      setTimeout(() => {
                        const eq = equipments.find(
                          (e) => e._id === selectedEquipmentDetail._id
                        );
                        if (eq) fetchHistory(eq);
                      }, 120);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500/20 px-4 py-2 text-xs font-semibold text-sky-100 border border-sky-400/60 hover:bg-sky-500/30 transition"
                  >
                    <span>View Past Operations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedEquipmentDetail(null)}
                    className="inline-flex items-center rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-50 hover:bg-slate-600 border border-white/10 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "form" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 p-6 shadow-2xl overflow-x-hidden"
          style={{ backgroundColor: "#153d59" }}
        >
          {/* Basic details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Equipment Code<span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="equipmentCode"
                value={form.equipmentCode}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="E.g., EQ-001"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Equipment Name<span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="equipmentName"
                value={form.equipmentName}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="E.g., Transfer Hose"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Equipment Type<span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="equipmentType"
                value={form.equipmentType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="E.g., Lifting Gear, Hose"
                required
              />
            </div>
          </div>

          {/* Specification / Manufacturer / Year */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Specification
              </label>
              <input
                type="text"
                name="specification"
                value={form.specification}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Size, capacity, rating, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Manufacturer name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Year of Manufacturing
              </label>
              <input
                type="number"
                name="yearOfManufacturing"
                value={form.yearOfManufacturing}
                onChange={handleNumberChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="e.g., 2022"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
          </div>

          {/* Ownership & dates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Ownership Type<span className="text-red-400">*</span>
              </label>
              <select
                name="ownershipType"
                value={form.ownershipType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="OWNED">Owned</option>
                <option value="THIRD_PARTY">Third Party</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Date of Purchase
              </label>
              <input
                type="date"
                name="dateOfPurchase"
                value={form.dateOfPurchase}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                First Use Date
              </label>
              <input
                type="date"
                name="firstUseDate"
                value={form.firstUseDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Retirement Period (years)
              </label>
              <input
                type="number"
                name="retirementPeriodYears"
                value={form.retirementPeriodYears}
                onChange={handleNumberChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="1"
              />
            </div>
          </div>

          {/* Test dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Last Test Date
              </label>
              <input
                type="date"
                name="lastTestDate"
                value={form.lastTestDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Next Test Date
              </label>
              <input
                type="date"
                name="nextTestDate"
                value={form.nextTestDate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="Any additional notes about this equipment"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-6 py-2.5 rounded-lg bg-emerald-500 text-sm font-semibold text-white shadow shadow-emerald-500/40 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Saving..." : "Save Equipment"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "history" && (
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          {/* Equipments list */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-white">
              Equipment List
            </h3>
            <button
              type="button"
              onClick={fetchEquipments}
              disabled={equipmentsLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-sky-400/40 text-sky-200 hover:bg-sky-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {equipmentsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {equipmentsError && (
            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-100">
              {equipmentsError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: equipments table */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden max-h-[420px] flex flex-col">
              <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 bg-white/5">
                Primary Equipments
              </div>
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-300 border-b border-white/10 bg-white/5">
                      <th className="px-4 py-2 font-semibold">Code</th>
                      <th className="px-4 py-2 font-semibold">Name</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold text-right">
                        Status
                      </th>
                      <th className="px-4 py-2 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.length === 0 && !equipmentsLoading && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-4 text-center text-slate-400"
                        >
                          No equipments found
                        </td>
                      </tr>
                    )}
                    {equipments.map((eq) => (
                      <tr
                        key={eq._id}
                        className={`border-b border-white/5 transition ${selectedEquipmentId === eq._id
                            ? "bg-sky-500/20"
                            : "hover:bg-white/5"
                          }`}
                      >
                        <td className="px-4 py-2 font-mono text-sky-300">
                          {eq.equipmentCode}
                        </td>
                        <td className="px-4 py-2 text-slate-100">
                          {eq.equipmentName}
                        </td>
                        <td className="px-4 py-2 text-slate-200">
                          {eq.equipmentType}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${eq.status === "ACTIVE"
                                ? "bg-emerald-500/10 border-emerald-400/60 text-emerald-200"
                                : eq.status === "RETIRED"
                                  ? "bg-slate-500/10 border-slate-400/60 text-slate-200"
                                  : "bg-amber-500/10 border-amber-400/60 text-amber-200"
                              }`}
                          >
                            {eq.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchHistory(eq);
                            }}
                            className="text-xs px-3 py-1 rounded-lg border border-sky-400/40 text-sky-200 hover:bg-sky-500/10 hover:border-sky-400/60 transition"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: history details */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-4">
              {!selectedEquipment && !historyLoading && (
                <p className="text-xs text-slate-300">
                  Select an equipment from the list to view its usage history.
                </p>
              )}

              {selectedEquipment && (
                <div className="space-y-2 border-b border-white/10 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400">Selected Equipment</p>
                      <p className="text-sm font-semibold text-white">
                        {selectedEquipment.equipmentName}
                      </p>
                      <p className="text-[11px] text-slate-300">
                        {selectedEquipment.equipmentCode} •{" "}
                        {selectedEquipment.equipmentType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400 mb-1">
                        Ownership
                      </p>
                      <p className="text-xs font-semibold text-slate-100">
                        {selectedEquipment.ownershipType}
                      </p>
                      {selectedEquipment.isInUse && (
                        <p className="mt-1 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 border border-emerald-400/60">
                          In Use
                        </p>
                      )}
                    </div>
                  </div>

                  {historyMeta && (
                    <p className="text-[11px] text-slate-300">
                      Total jobs:{" "}
                      <span className="font-semibold text-sky-200">
                        {historyMeta.totalJobs}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {historyError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-100">
                  {historyError}
                </div>
              )}

              {historyLoading && (
                <p className="text-xs text-slate-300">Loading history...</p>
              )}

              {!historyLoading && selectedEquipment && history.length === 0 && !historyError && (
                <p className="text-xs text-slate-300">
                  No history records found for this equipment. This equipment has not been used in any STS operations yet.
                </p>
              )}

              {!historyLoading && history.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-auto max-h-[320px]">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-slate-100 border-b border-white/10 bg-slate-900/80">
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Job No
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          CHS
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          MS
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Cargo Type
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Date of Job
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Client
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Quantity cargo
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Used Hours
                        </th>
                        <th className="px-4 py-3 font-semibold text-xs tracking-wide">
                          Usage Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, idx) => (
                        <tr
                          key={`${h.jobNo || idx}-${idx}`}
                          className="border-b border-white/5 hover:bg-white/5 transition"
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-sky-500/15 px-3 py-1 text-[10px] font-semibold text-sky-100 border border-sky-400/70">
                              {h.jobNo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-50 font-medium">
                            {h.chs}
                          </td>
                          <td className="px-4 py-3 text-slate-50 font-medium">
                            {h.ms}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {h.typeOfCargo}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {formatDateTime(h.dateOfJob)}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {h.client}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {h.quantityCargo}
                          </td>
                          <td className="px-4 py-3 text-slate-100">
                            {h.usedHours ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 border border-emerald-400/60 text-emerald-200">
                              {h.usageStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}