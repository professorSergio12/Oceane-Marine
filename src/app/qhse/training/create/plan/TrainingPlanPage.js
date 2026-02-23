"use client";

import { useState } from "react";
import Link from "next/link";
import { useQhseSidebar } from "../../../QhseSidebarContext";

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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "April",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_PAIRS = [
  { label: "Jan–Feb", months: [0, 1] },
  { label: "Mar–Apr", months: [2, 3] },
  { label: "May–Jun", months: [4, 5] },
  { label: "Jul–Aug", months: [6, 7] },
  { label: "Sep–Oct", months: [8, 9] },
  { label: "Nov–Dec", months: [10, 11] },
];

const formatDateInput = (year, monthIndex, day = 1) => {
  // Avoid timezone shifts by building the date string manually (YYYY-MM-DD)
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

export default function TrainingPlanPage({ hideSidebar = false }) {
  const currentYear = new Date().getFullYear();
  const initialYear = currentYear;

  const [year, setYear] = useState(initialYear);
  const [selectedPair, setSelectedPair] = useState(0); // 0-5 index
  const [monthData, setMonthData] = useState(() => {
    // Initialize all 6 pairs with empty data (use first month of the pair for the date)
    return MONTH_PAIRS.map((pair) => ({
      plannedDate: formatDateInput(initialYear, pair.months[0], 1),
      topic: "",
      instructor: "",
      description: "",
    }));
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [monthPairFiles, setMonthPairFiles] = useState({
    "Jan-Feb": null,
    "Mar-Apr": null,
    "May-Jun": null,
    "Jul-Aug": null,
    "Sep-Oct": null,
    "Nov-Dec": null,
  });

  const handleYearChange = (newYear) => {
    setYear(newYear);
    setMonthData((prev) =>
      prev.map((data, index) => {
        const pair = MONTH_PAIRS[index];
        // If plannedDate exists, preserve the day, shift year, keep month from the pair's first month
        const day =
          data.plannedDate && !isNaN(new Date(data.plannedDate).getTime())
            ? new Date(data.plannedDate).getDate()
            : 1;
        return {
          ...data,
          plannedDate: formatDateInput(newYear, pair.months[0], day),
        };
      })
    );
    setMessage(null);
    setError(null);
  };

  const handleFieldChange = (field, value) => {
    setMonthData((prev) => {
      const next = [...prev];
      next[selectedPair] = { ...next[selectedPair], [field]: value };

      // If plannedDate is changed, sync the year
      if (field === "plannedDate" && value) {
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          const newYear = dateObj.getFullYear();
          if (newYear !== year) {
            setYear(newYear);
          }
        }
      }

      return next;
    });
  };

  const handleNextPair = () => {
    if (selectedPair < MONTH_PAIRS.length - 1) {
      setSelectedPair(selectedPair + 1);
    }
  };

  const handlePrevPair = () => {
    if (selectedPair > 0) {
      setSelectedPair(selectedPair - 1);
    }
  };

  const handleMonthPairFileChange = (monthPair, file) => {
    setMonthPairFiles((prev) => ({
      ...prev,
      [monthPair]: file,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      // One plan item per pair (use first month as the representative date)
      const planItems = monthData
        .filter((item) => item.topic.trim() && item.instructor.trim())
        .map((item, idx) => {
          const pair = MONTH_PAIRS[idx];
          const baseDate = new Date(item.plannedDate);
          const day = !isNaN(baseDate.getTime()) ? baseDate.getDate() : 1;
          return {
            plannedDate: formatDateInput(year, pair.months[0], day),
            topic: item.topic.trim(),
            instructor: item.instructor.trim(),
            description: item.description.trim() || undefined,
            status: "Approved", // carry approval intent
          };
        });

      if (!planItems.length) {
        setError("Please fill at least one month with Topic and Instructor.");
        setSaving(false);
        return;
      }

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("planItems", JSON.stringify(planItems));

      // Append month pair files if they exist
      Object.keys(monthPairFiles).forEach((monthPair) => {
        const file = monthPairFiles[monthPair];
        if (file) {
          formData.append(`monthPairFile_${monthPair}`, file);
        }
      });

      const res = await fetch("/api/qhse/training/plan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create training plan");
      }

      setMessage(`Training plan for ${year} saved successfully`);
      setError(null);
      
      // Reset form after successful submission
      setMonthData(
        MONTH_PAIRS.map((pair) => ({
          plannedDate: formatDateInput(year, pair.months[0], 1),
          topic: "",
          instructor: "",
          description: "",
        }))
      );
      setMonthPairFiles({
        "Jan-Feb": null,
        "Mar-Apr": null,
        "May-Jun": null,
        "Jul-Aug": null,
        "Sep-Oct": null,
        "Nov-Dec": null,
      });
      setSelectedPair(0);
      
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
      setMessage(null);
    } finally {
      setSaving(false);
    }
  };

  const currentPairData = monthData[selectedPair];
  const hasData =
    currentPairData.topic.trim() ||
    currentPairData.instructor.trim() ||
    currentPairData.description.trim();

  const { contentClassName } = useQhseSidebar();
  const content = (
    <div className={hideSidebar ? "flex-1" : `${contentClassName} pr-4`}>
        <div className="w-full max-w-[95%] mx-auto pl-4 pr-4 py-10 space-y-6">
          <header className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
                  QHSE / Training
                </p>
                <h1 className="text-2xl font-bold">Annual Training Matrix</h1>
                <p className="text-xs text-slate-200 mt-1">
                  Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-038</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <a
                  href="/templates/qhse/QAF-OFD-038  - Training Plan.docx"
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                  title="Download form template (QAF-OFD-038)"
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
                  href="/qhse/training/create/plan"
                  className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
                >
                  Training Matrix
                </Link>
                <Link
                  href="/qhse/training/create/record"
                  className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  Training Record
                </Link>
              </div>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl space-y-6"
          >
            {/* Month Selector Bar */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300 text-center">
                Select Month Pair
              </p>
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                {MONTH_PAIRS.map((pair, index) => (
                  <button
                    key={pair.label}
                    type="button"
                    onClick={() => setSelectedPair(index)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      selectedPair === index
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
                        : "text-sky-200 hover:bg-white/10 border border-transparent"
                    } ${hasData && selectedPair === index ? "ring-2 ring-emerald-400/50" : ""}`}
                  >
                    {pair.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="rounded-2xl border border-white/10 bg-[#0b2740]/80 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">
                    {MONTH_PAIRS[selectedPair].label} {year}
                  </h2>
                  <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                      Status: Draft
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedPair > 0 && (
                    <button
                      type="button"
                      onClick={handlePrevPair}
                      className="px-3 py-1 rounded-lg border border-white/20 bg-white/5 text-xs font-semibold hover:bg-white/10 transition"
                    >
                      ← Prev
                    </button>
                  )}
                  {selectedPair < MONTH_PAIRS.length - 1 && (
                    <button
                      type="button"
                      onClick={handleNextPair}
                      className="px-3 py-1 rounded-lg border border-white/20 bg-white/5 text-xs font-semibold hover:bg-white/10 transition"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="planned-date" className="block text-sm font-semibold text-white/90">
                    Training Planned on :
                  </label>
                  <div className="relative">
                    <input
                      id="planned-date"
                      type="date"
                      value={currentPairData.plannedDate}
                      onChange={(e) => handleFieldChange("plannedDate", e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                    />
                    
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="instructor" className="block text-sm font-semibold text-white/90">
                    Instructor :
                  </label>
                  <input
                    id="instructor"
                    type="text"
                    value={currentPairData.instructor}
                    onChange={(e) => handleFieldChange("instructor", e.target.value)}
                    placeholder="Enter instructor name"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="topic" className="block text-sm font-semibold text-white/90">
                    Topic :
                  </label>
                  <input
                    id="topic"
                    type="text"
                    value={currentPairData.topic}
                    onChange={(e) => handleFieldChange("topic", e.target.value)}
                    placeholder="Enter training topic"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <label htmlFor="description" className="block text-sm font-semibold text-white/90">
                    Description :
                  </label>
                  <textarea
                    id="description"
                    rows={2}
                    value={currentPairData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Short description, target group, location, etc."
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

            {/* Month Pair File Upload - only for selected month pair */}
            <div className="rounded-2xl border border-white/10 bg-[#0b2740]/80 p-6 space-y-4">
              <h3 className="text-base font-semibold text-white border-b border-white/10 pb-2">
                Training Matrix File Attachment
              </h3>
              {(() => {
                const pair = MONTH_PAIRS[selectedPair];
                const monthPairKey = pair.label.replace("–", "-");
                return (
                  <div className="space-y-2">
                    <label
                      htmlFor={`monthPair-${monthPairKey}`}
                      className="block text-xs font-semibold text-white/90"
                    >
                      {pair.label}:
                    </label>
                    <input
                      id={`monthPair-${monthPairKey}`}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleMonthPairFileChange(monthPairKey, file);
                      }}
                      className="w-full text-xs text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500 file:text-white hover:file:bg-sky-600 file:cursor-pointer cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-2 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                    />
                    {monthPairFiles[monthPairKey] && (
                      <p className="text-xs text-emerald-300 truncate">
                        ✓ {monthPairFiles[monthPairKey].name}
                      </p>
                    )}
                  </div>
                );
              })()}
              <p className="text-xs text-slate-400">
                Upload training matrix file for the selected month pair. Supported formats: PDF, Word, Excel, Images (max 25MB).
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-orange-500 text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-orange-500/40 hover:bg-orange-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : `Submit Plan for ${year}`}
              </button>
            </div>
          </form>
        </div>
      </div>
  );

  if (hideSidebar) {
    return content;
  }

  return content;
}


