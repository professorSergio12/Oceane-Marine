"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQhseSidebar } from "../../../QhseSidebarContext";

/* ---------------- helpers ---------------- */

// Generate dynamic years
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

// Normalize date to yyyy-mm-dd
const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};

const getInitialFormData = (overrides = {}) => ({
  drillNo: "",
  drillDate: new Date().toISOString().slice(0, 10),
  location: "",
  drillScenario: "",
  participants: [{ name: "", role: "" }],
  incidentProgression: "",
  ...overrides,
});

/* ---------------- component ---------------- */

export default function DrillsReportClient() {
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();

  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(0);

  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [creatingFor, setCreatingFor] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState(() => getInitialFormData());

  /* ---------------- effects ---------------- */

  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/drill/plan");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          const merged = Array.from(
            new Set([...initialYears, ...data.data])
          ).sort((a, b) => b - a);
          setAvailableYears(merged);
          if (!merged.includes(year)) setYear(merged[0]);
        }
      } finally {
        setLoadingYears(false);
      }
    };
    loadYears();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPlan = async () => {
      setPlanLoading(true);
      setPlanError(null);
      setCreatingFor(null);
      try {
        const res = await fetch(`/api/qhse/drill/plan?year=${year}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "No approved plan for this year");
        }
        if (active) setPlan(data.data);
      } catch (err) {
        if (active) {
          setPlan(null);
          setPlanError(err.message);
        }
      } finally {
        if (active) setPlanLoading(false);
      }
    };
    fetchPlan();
    return () => {
      active = false;
    };
  }, [year]);

  /* ---------------- handlers ---------------- */

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleParticipantChange = (index, field, value) => {
    setFormData((prev) => {
      const participants = [...prev.participants];
      participants[index] = { ...participants[index], [field]: value };
      return { ...prev, participants };
    });
  };

  const addParticipant = () => {
    setFormData((prev) => ({
      ...prev,
      participants: [...prev.participants, { name: "", role: "" }],
    }));
  };

  const removeParticipant = (index) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index),
    }));
  };

  const applyPlanItem = (item) => {
    if (!item) return;
    const qIndex = QUARTERS.indexOf(item.quarter);
    if (qIndex >= 0) setSelectedQuarter(qIndex);
    // Reset form to empty for the new quarter, then apply only plan-derived fields
    setFormData(
      getInitialFormData({
        drillDate: toDateInputValue(item.plannedDate),
        drillScenario: item.topic || "",
      })
    );
    setCreatingFor(item);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const validParticipants = formData.participants.filter(
        (p) => p.name.trim() && p.role.trim()
      );

      if (
        !formData.drillNo ||
        !formData.drillScenario ||
        validParticipants.length === 0
      ) {
        throw new Error("Please fill all required fields.");
      }

      const res = await fetch("/api/qhse/drill/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          participants: validParticipants,
          year,
          quarter: QUARTERS[selectedQuarter],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create drill report");
      }

      setMessage("Drill report saved successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */

  const { contentClassName } = useQhseSidebar();
  return (
    <div className={contentClassName}>
      <div className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
          <header className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
                  QHSE / Drills
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Drill Report</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                  Year
                </span>
                <select
                  className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
                  value={year || ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                  disabled={loadingYears || availableYears.length === 0}
                >
                  {loadingYears ? (
                    <option>Loading...</option>
                  ) : availableYears.length === 0 ? (
                    <option>No data</option>
                  ) : (
                    availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <Link
                  href="/qhse/drills/create/plan"
                  className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  Drill Matrix
                </Link>
                <Link
                  href="/qhse/drills/create/report"
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
                >
                  Drill Report
                </Link>
                <Link
                  href="/qhse/drills/list"
                  className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  View List
                </Link>
              </div>
            </div>
          </header>

          {/* Plan list and create-report trigger */}
          <div className="rounded-2xl border border-white/10 bg-[#0b2740]/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="text-lg font-semibold">Quarterly Drill Plan</h2>
              <div className="flex items-center gap-3">
                {plan && (
                  <span className="text-xs px-2 py-1 rounded-lg border border-white/15 bg-white/5 text-slate-200">
                    Plan year: {plan.year}
                  </span>
                )}
                <span className="text-xs text-slate-300">
                  Select a quarter to create report
                </span>
              </div>
            </div>
            {planLoading && (
              <p className="text-sm text-slate-200">Loading plan…</p>
            )}
            {planError && (
              <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
                {planError}
              </div>
            )}
            {plan && plan.year !== year && (
              <div className="text-sm text-amber-200 bg-amber-950/40 border border-amber-500/40 rounded-lg px-4 py-2">
                Plan year ({plan.year}) differs from selected year ({year}).
                Switch the selector to match.
              </div>
            )}
            {plan && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {QUARTERS.map((q) => {
                  const item = plan.planItems.find((p) => p.quarter === q);
                  return (
                    <div
                      key={q}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{q}</span>
                        <span className="text-xs text-slate-300">
                          {item ? toDateInputValue(item.plannedDate) : "—"}
                        </span>
                      </div>
                      <p className="text-sm text-white/90">
                        {item?.topic || "No plan"}
                      </p>
                      <p className="text-xs text-slate-300">
                        {item?.instructor || ""}
                      </p>
                      <button
                        type="button"
                        disabled={!item}
                        onClick={() => item && applyPlanItem(item)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-orange-400/60 text-orange-200 hover:bg-orange-500/10 disabled:opacity-50"
                      >
                        {item ? "Create report" : "Not planned"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quarter File Downloads Section */}
          {plan && plan.quarterFiles && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 space-y-4">
              <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                Drill Matrix Files (Quarter-wise)
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {QUARTERS.map((quarter) => {
                  const quarterFile = plan.quarterFiles?.[quarter];
                  if (!quarterFile || !quarterFile.filePath) return null;

                  return (
                    <div
                      key={quarter}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {quarter}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {quarterFile.fileName || "Drill Matrix"}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              `/api/qhse/drill/download/quarter-file?planId=${plan._id}&quarter=${quarter}`
                            );
                            if (!res.ok) {
                              throw new Error("Failed to download file");
                            }
                            const blob = await res.blob();
                            const url = globalThis.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download =
                              quarterFile.fileName ||
                              `drill-matrix-${quarter}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            globalThis.URL.revokeObjectURL(url);
                            a.remove();
                          } catch (err) {
                            alert(err.message || "Failed to download file");
                          }
                        }}
                        className="w-full text-xs text-sky-300 hover:text-sky-200 font-medium px-3 py-2 rounded border border-sky-400/30 hover:bg-sky-400/10 transition"
                      >
                        📥 Download {quarter} File
                      </button>
                    </div>
                  );
                })}
              </div>
              {!QUARTERS.some(
                (q) => plan.quarterFiles?.[q]?.filePath
              ) && (
                <p className="text-xs text-slate-400 text-center py-4">
                  No drill matrix files uploaded for this plan.
                </p>
              )}
            </div>
          )}

          {creatingFor && (
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl space-y-6"
            >
              {/* Form Fields */}
              <div className="rounded-2xl border border-white/10 bg-[#0b2740]/80 p-6 space-y-6">
                {/* General Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">➕</span>
                      <h2 className="text-lg font-semibold">
                        Drill report details
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreatingFor(null)}
                      className="text-xs text-slate-200 hover:text-white"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="drill-no"
                        className="block text-sm font-semibold text-white/90"
                      >
                        Drill No. :
                      </label>
                      <input
                        id="drill-no"
                        type="text"
                        value={formData.drillNo}
                        onChange={(e) =>
                          handleFieldChange("drillNo", e.target.value)
                        }
                        placeholder="e.g., 006-2025"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="drill-date"
                        className="block text-sm font-semibold text-white/90"
                      >
                        Drill Date :
                      </label>
                      <input
                        id="drill-date"
                        type="date"
                        value={formData.drillDate}
                        onChange={(e) =>
                          handleFieldChange("drillDate", e.target.value)
                        }
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="location"
                        className="block text-sm font-semibold text-white/90"
                      >
                        Location :
                      </label>
                      <input
                        id="location"
                        type="text"
                        value={formData.location}
                        onChange={(e) =>
                          handleFieldChange("location", e.target.value)
                        }
                        placeholder="Location (e.g., Dubai D anchorage)"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label
                        htmlFor="drill-scenario"
                        className="block text-sm font-semibold text-white/90"
                      >
                        Drill Scenario :
                      </label>
                      <input
                        id="drill-scenario"
                        type="text"
                        value={formData.drillScenario}
                        onChange={(e) =>
                          handleFieldChange("drillScenario", e.target.value)
                        }
                        placeholder="e.g., Fender Failure while approach"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Participants Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h2 className="text-lg font-semibold">Participants</h2>
                    <button
                      type="button"
                      onClick={addParticipant}
                      className="px-3 py-1 rounded-lg border border-white/20 bg-white/5 text-xs font-semibold hover:bg-white/10 transition"
                    >
                      + Add Participant
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.participants.map((participant, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-1 grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            value={participant.name}
                            onChange={(e) =>
                              handleParticipantChange(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Participant Name"
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                          />
                          <input
                            type="text"
                            value={participant.role}
                            onChange={(e) =>
                              handleParticipantChange(
                                index,
                                "role",
                                e.target.value
                              )
                            }
                            placeholder="Role (e.g., Designated Crisis Manager)"
                            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                          />
                        </div>
                        {formData.participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            className="px-3 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Incident Progression Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <h2 className="text-lg font-semibold">
                      Incident Progression :
                    </h2>
                  </div>

                  <textarea
                    rows={8}
                    value={formData.incidentProgression}
                    onChange={(e) =>
                      handleFieldChange("incidentProgression", e.target.value)
                    }
                    placeholder="Describe the incident progression in detail..."
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none resize-none"
                  />
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-base text-emerald-300 bg-emerald-950/40 border-2 border-emerald-500/60 rounded-lg px-6 py-4 shadow-lg shadow-emerald-500/20">
                  <span className="font-semibold">{message}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-orange-500 text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-orange-500/40 hover:bg-orange-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Drill Report"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
