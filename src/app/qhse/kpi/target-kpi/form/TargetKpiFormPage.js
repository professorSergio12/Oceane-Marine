"use client";

import { useState, useCallback, useEffect } from "react";
import { useQhseSidebar } from "../../../QhseSidebarContext";
import Link from "next/link";

const DEFAULT_KPI_TITLES = [
  "Mooring Master Feedback",
  "Spills to water",
  "Critical Incidents",
  "Non-Critical Incidents",
  "Near Miss reporting",
  "Stop Work Authority",
  "Injuries to personnel - Minor",
  "Injuries to personnel - Severe",
  "QHSE Meetings",
  "Emergency Drills",
  "Safety Bulletins",
  "Health Bulletin",
  "Best Practices",
];

const emptyRow = (title = "") => ({
  title,
  targetForYear: 0,
  quarter1: 0,
  quarter2: 0,
  quarter3: 0,
  quarter4: 0,
  targetsAchieved: 0,
});

// Allow only digits and optional one decimal (prevents scroll-from-changing value when using type="text" + inputMode="decimal")
const NUMERIC_DECIMAL_PATTERN = /^\d*\.?\d*$/;
function handleNumericChange(value, setter) {
  if (value === "" || NUMERIC_DECIMAL_PATTERN.test(value)) setter(value);
}

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function TargetKpiFormPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState(() =>
    DEFAULT_KPI_TITLES.map((t) => emptyRow(t))
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [formCode, setFormCode] = useState("HSE-001A");
  const [serialNumber, setSerialNumber] = useState(null);

  const years = getYears();

  // Fetch form code on mount (may override if API returns different value); after save we update with actual from response
  useEffect(() => {
    let cancelled = false;
    fetch("/api/qhse/kpi/target/code")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.formCode) {
          setFormCode(data.formCode);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const updateRow = useCallback((index, field, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      );
      if (field === "quarter1" || field === "quarter2" || field === "quarter3" || field === "quarter4") {
        const r = next[index];
        const sum =
          (Number(r.quarter1) || 0) +
          (Number(r.quarter2) || 0) +
          (Number(r.quarter3) || 0) +
          (Number(r.quarter4) || 0);
        next[index] = { ...r, targetsAchieved: sum };
      }
      return next;
    });
  }, []);

  const updateRowTargetsAchieved = useCallback((index, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, targetsAchieved: Number(value) || 0 } : r))
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow("")]);
  }, []);

  const removeRow = useCallback((index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const payload = {
      year,
      rows: rows.map((r) => ({
        title: r.title,
        targetForYear: Number(r.targetForYear) || 0,
        quarter1: Number(r.quarter1) || 0,
        quarter2: Number(r.quarter2) || 0,
        quarter3: Number(r.quarter3) || 0,
        quarter4: Number(r.quarter4) || 0,
        targetsAchieved: Number(r.targetsAchieved) || 0,
      })),
    };

    try {
      const res = await fetch("/api/qhse/kpi/target/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save");
      const savedCode = data.data?.formCode || null;
      const savedSerial = data.data?.serialNumber || null;
      if (savedCode) setFormCode(savedCode);
      if (savedSerial) setSerialNumber(savedSerial);
      const displayCode = savedCode || formCode || "HSE-001A";
      setMessage("Target KPI saved successfully. Form code: " + displayCode);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const { contentClassName } = useQhseSidebar();
  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / KPI / Target KPI
            </p>
            <h1 className="text-2xl font-bold">Target KPI</h1>
            <p className="text-sm text-slate-200 mt-1">
              Set targets for the selected year and track quarterly achievements.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                  Year
                </span>
                <select
                  className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase bg-slate-800 border border-white/20 text-white"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-[13rem] rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <Link
                  href="/qhse/kpi/target-kpi/form"
                  className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
                >
                  Target KPI
                </Link>
                <Link
                  href="/qhse/kpi/create"
                  className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  KPI
                </Link>
              </div>
            </div>
            <div className="flex w-[13rem] rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/kpi/target-kpi/form"
                className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Form
              </Link>
              <Link
                href="/qhse/kpi/target-kpi/list"
                className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                List
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-xl border border-slate-500/40 bg-slate-800/30 px-4 py-3 flex flex-wrap items-start gap-6">
          <div className="min-h-[2.5rem] flex flex-col">
            <span className="text-slate-300 text-xs uppercase tracking-wider block mb-0.5">Form Code</span>
            <span className="text-white font-mono text-sm font-semibold">{formCode ?? "—"}</span>
          </div>
          <div className="min-h-[2.5rem] flex flex-col">
            <span className="text-slate-300 text-xs uppercase tracking-wider block mb-0.5">Serial</span>
            {serialNumber ? (
              <span className="text-white font-mono text-sm font-semibold">{serialNumber}</span>
            ) : (
              <span className="text-slate-500 text-xs mt-0.5">Auto-generated on save (e.g. 2026-001)</span>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {message && (
          <div className="text-base text-emerald-300 bg-emerald-950/40 border border-emerald-500/60 rounded-lg px-6 py-4">
            {message}
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-500/30 overflow-hidden">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#366092]">
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                      Title
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide whitespace-nowrap">
                      Targets for {year}
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                      Quarter 1
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                      Quarter 2
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                      Quarter 3
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                      Quarter 4
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                      Targets Achieved
                    </th>
                    <th className="border border-slate-400/50 px-2 py-2 w-12 bg-[#366092] text-white font-semibold uppercase tracking-wide text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="hover:bg-white/5">
                      <td className="border border-slate-400/40 px-3 py-2 bg-[#5a8bc4]/80 text-white">
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => updateRow(index, "title", e.target.value)}
                          className="w-full bg-transparent border-none text-white placeholder-white/60 focus:ring-0 p-0 min-w-[180px]"
                          placeholder="KPI title"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.targetForYear === 0 ? "" : row.targetForYear}
                          onChange={(e) =>
                            handleNumericChange(e.target.value, (v) => updateRow(index, "targetForYear", v))
                          }
                          onWheel={(e) => e.target.blur()}
                          className="w-20 bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-white text-center tabular-nums"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quarter1 === 0 ? "" : row.quarter1}
                          onChange={(e) =>
                            handleNumericChange(e.target.value, (v) => updateRow(index, "quarter1", v))
                          }
                          onWheel={(e) => e.target.blur()}
                          className="w-20 bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-white text-center tabular-nums"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quarter2 === 0 ? "" : row.quarter2}
                          onChange={(e) =>
                            handleNumericChange(e.target.value, (v) => updateRow(index, "quarter2", v))
                          }
                          onWheel={(e) => e.target.blur()}
                          className="w-20 bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-white text-center tabular-nums"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quarter3 === 0 ? "" : row.quarter3}
                          onChange={(e) =>
                            handleNumericChange(e.target.value, (v) => updateRow(index, "quarter3", v))
                          }
                          onWheel={(e) => e.target.blur()}
                          className="w-20 bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-white text-center tabular-nums"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.quarter4 === 0 ? "" : row.quarter4}
                          onChange={(e) =>
                            handleNumericChange(e.target.value, (v) => updateRow(index, "quarter4", v))
                          }
                          onWheel={(e) => e.target.blur()}
                          className="w-20 bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-white text-center tabular-nums"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.targetsAchieved === 0 ? "" : row.targetsAchieved}
                          onChange={(e) =>
                            handleNumericChange(e.target.value, (v) => updateRowTargetsAchieved(index, v))
                          }
                          onWheel={(e) => e.target.blur()}
                          className="w-20 bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-white text-center tabular-nums"
                        />
                      </td>
                      <td className="border border-slate-400/40 px-2 py-2 bg-slate-800/50 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-red-400 hover:text-red-300 text-base font-bold inline-flex items-center justify-center w-6 h-6 rounded border border-red-400/40 hover:border-red-400/60 hover:bg-red-500/10 transition"
                          title="Delete row"
                          aria-label="Delete row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addRow}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
              >
                + Add row
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-full bg-orange-500 hover:bg-orange-400 px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Save Target KPI"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
