"use client";

import { useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import QhseSidebar from "../../../components/QhseSidebar";
import SideBarSkeleton from "../../../components/SideBarSkeleton";
import { useQhseSidebar } from "../../../QhseSidebarContext";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";

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

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

// Normalize to yyyy-mm-dd without timezone shifting
function toDateInput(year, monthIndex, day = 1) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

// Get quarter start date based on year and quarter index
function getQuarterStartDate(year, quarterIndex) {
  const month = quarterIndex * 3; // Q1=0, Q2=3, Q3=6, Q4=9
  return toDateInput(year, month, 1);
}

export default function DrillsPlanPage({ hideSidebar = false }) {
  const currentYear = new Date().getFullYear();
  const initialYear = currentYear;

  const [year, setYear] = useState(initialYear);
  const [selectedQuarter, setSelectedQuarter] = useState(0); // 0-3 index
  const [quarterData, setQuarterData] = useState(() => {
    // Initialize all 4 quarters with empty data
    return QUARTERS.map((_, index) => ({
      plannedDate: getQuarterStartDate(initialYear, index),
      topic: "",
      instructor: "",
      description: "",
    }));
  });
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [savedPlan, setSavedPlan] = useState(null);
  const [quarterFiles, setQuarterFiles] = useState({
    Q1: null,
    Q2: null,
    Q3: null,
    Q4: null,
  });

  const handleYearChange = (newYear) => {
    setYear(newYear);
    setQuarterData((prev) =>
      prev.map((data, index) => ({
        ...data,
        plannedDate: getQuarterStartDate(newYear, index),
      }))
    );
    setMessage(null);
    setError(null);
  };

  const handleFieldChange = (field, value) => {
    setQuarterData((prev) => {
      const next = [...prev];
      next[selectedQuarter] = { ...next[selectedQuarter], [field]: value };
      return next;
    });
  };

  const handleNextQuarter = () => {
    if (selectedQuarter < QUARTERS.length - 1) {
      setSelectedQuarter(selectedQuarter + 1);
    }
  };

  const handlePrevQuarter = () => {
    if (selectedQuarter > 0) {
      setSelectedQuarter(selectedQuarter - 1);
    }
  };

  const handleQuarterFileChange = (quarter, file) => {
    setQuarterFiles((prev) => ({
      ...prev,
      [quarter]: file,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      // Filter out quarters where topic or instructor is empty
      const planItems = quarterData
        .filter((item) => item.topic.trim() && item.instructor.trim())
        .map((item) => ({
          plannedDate: item.plannedDate,
          topic: item.topic.trim(),
          instructor: item.instructor.trim(),
          description: item.description.trim() || undefined,
        }));

      if (!planItems.length) {
        setError("Please fill at least one quarter with Topic and Instructor.");
        setSaving(false);
        return;
      }

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("planItems", JSON.stringify(planItems));
      formData.append("year", year.toString());

      // Append quarter files if they exist
      Object.keys(quarterFiles).forEach((quarter) => {
        const file = quarterFiles[quarter];
        if (file) {
          formData.append(`quarterFile_${quarter}`, file);
        }
      });

      const res = await fetch("/api/qhse/drill/plan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create drill plan");
      }

      setMessage(`Drill plan for ${year} saved successfully!`);
      setError(null);
      setSavedPlan(data.data);

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
      setMessage(null);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!savedPlan?._id) {
      setError("Save the plan first, then approve.");
      return;
    }
    setApproving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/qhse/drill/plan/${savedPlan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve drill plan");
      }
      setSavedPlan(data.data);
      setMessage("Drill plan approved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const currentQuarterData = quarterData[selectedQuarter];
  const hasData =
    currentQuarterData.topic.trim() ||
    currentQuarterData.instructor.trim() ||
    currentQuarterData.description.trim();

  const content = (
    <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
            QHSE / Drills
          </p>
          <h1 className="text-2xl font-bold text-white">Drill Plan</h1>
          <p className="text-sm text-slate-200 mt-1">
            Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-040</span>
          </p>
        </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <TemplateDownloadLink formCode="QAF-OFD-040" />
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                Year
              </span>
              <select
                className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {getYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/drills/create/plan"
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Drill Matrix
              </Link>
              <Link
                href="/qhse/drills/create/report"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
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
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl space-y-6"
        >
          {/* Quarter Slider */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300 text-center">
              Select Quarter
            </p>
            <div className="flex items-center gap-1 border border-sky-400/30 rounded-xl bg-white/5 p-1 overflow-x-auto">
              {QUARTERS.map((quarter, index) => {
                const isSelected = selectedQuarter === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedQuarter(index)}
                    className={`flex-1 min-w-[80px] px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      isSelected
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
                        : "text-sky-200 hover:bg-white/10 border border-transparent"
                    } ${
                      hasData && isSelected ? "ring-2 ring-emerald-400/50" : ""
                    }`}
                  >
                    {quarter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="rounded-2xl border border-white/10 bg-[#0b2740]/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">
                  {QUARTERS[selectedQuarter]} {year}
                </h2>
                <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                    Status: Draft
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedQuarter > 0 && (
                  <button
                    type="button"
                    onClick={handlePrevQuarter}
                    className="px-3 py-1 rounded-lg border border-white/20 bg-white/5 text-xs font-semibold hover:bg-white/10 transition"
                  >
                    ← Prev
                  </button>
                )}
                {selectedQuarter < QUARTERS.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextQuarter}
                    className="px-3 py-1 rounded-lg border border-white/20 bg-white/5 text-xs font-semibold hover:bg-white/10 transition"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="planned-date"
                  className="block text-sm font-semibold text-white/90"
                >
                  Drill Planned on :
                </label>
                <div className="relative">
                  <input
                    id="planned-date"
                    type="date"
                    value={currentQuarterData.plannedDate}
                    onChange={(e) =>
                      handleFieldChange("plannedDate", e.target.value)
                    }
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                 
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="instructor"
                  className="block text-sm font-semibold text-white/90"
                >
                  Instructor :
                </label>
                <input
                  id="instructor"
                  type="text"
                  value={currentQuarterData.instructor}
                  onChange={(e) =>
                    handleFieldChange("instructor", e.target.value)
                  }
                  placeholder="Enter instructor name"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="topic"
                  className="block text-sm font-semibold text-white/90"
                >
                  Topic :
                </label>
                <input
                  id="topic"
                  type="text"
                  value={currentQuarterData.topic}
                  onChange={(e) => handleFieldChange("topic", e.target.value)}
                  placeholder="Enter drill topic"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-white/90"
                >
                  Description :
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={currentQuarterData.description}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                  placeholder="Enter drill description"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none resize-none"
                />
              </div>
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

          {/* Quarter File Upload - keyed by quarter so input shows correct file per Q */}
          <div className="rounded-2xl border border-white/10 bg-[#0b2740]/80 p-6 space-y-4">
            <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
              Drill Matrix File Attachment
            </h3>
            {QUARTERS.map((q, idx) => {
              const isActive = idx === selectedQuarter;
              const fileForQuarter = quarterFiles[q];
              return (
                <div
                  key={q}
                  className={`space-y-2 ${!isActive ? "hidden" : ""}`}
                  aria-hidden={!isActive}
                >
                  <label
                    htmlFor={`quarter-file-${q}`}
                    className="block text-xs font-semibold text-white/90"
                  >
                    {q}:
                  </label>
                  <input
                    id={`quarter-file-${q}`}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleQuarterFileChange(q, file);
                    }}
                    className="w-full text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500 file:text-white hover:file:bg-sky-600 file:cursor-pointer cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                  />
                  {fileForQuarter ? (
                    <p className="text-xs text-emerald-300 truncate">
                      ✓ {fileForQuarter.name}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">No file chosen for {q}</p>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-slate-400">
              Upload drill matrix file for the selected quarter. Supported formats: PDF, Word, Excel, Images (max 25MB).
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            {savedPlan && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/40 hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>✔</span>
                <span>{approving ? "Approving..." : "Approve Plan"}</span>
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-orange-500/40 hover:bg-orange-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>✉️✓→</span>
              <span>{saving ? "Saving..." : "Send for Approval"}</span>
            </button>
          </div>
        </form>
    </div>
  );

  const { contentClassName } = useQhseSidebar();
  if (hideSidebar) {
    return content;
  }

  return <div className={`${contentClassName} pr-4`}>{content}</div>;
}
