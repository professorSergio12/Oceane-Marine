"use client";

import { useEffect, useState } from "react";

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

export default function EquipmentTesting() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // per-row plannedOn & tester
  const [rowInputs, setRowInputs] = useState({});
  const [savingRow, setSavingRow] = useState(null);
  const [rowSuccess, setRowSuccess] = useState(null);

  const loadEquipments = async (selectedYear) => {
    if (!selectedYear) return;
    setLoading(true);
    setError(null);
    setRowSuccess(null);
    try {
      const res = await fetch(
        `/api/pms/equipment-testing/list?year=${encodeURIComponent(
          selectedYear
        )}`
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned invalid response");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load equipments");
      }

      const rows = data.data || [];
      setEquipments(rows);

      // initialise empty inputs per row
      const initialInputs = {};
      rows.forEach((eq) => {
        initialInputs[eq._id] = {
          plannedOn: "",
          tester: "",
        };
      });
      setRowInputs(initialInputs);
    } catch (err) {
      console.error("Load equipments error:", err);
      setEquipments([]);
      setError(err.message || "Failed to load equipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipments(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const handleInputChange = (equipmentId, field, value) => {
    setRowInputs((prev) => ({
      ...prev,
      [equipmentId]: {
        ...(prev[equipmentId] || { plannedOn: "", tester: "" }),
        [field]: value,
      },
    }));
  };

  const handlePlanTest = async (equipment) => {
    const input = rowInputs[equipment._id] || {
      plannedOn: "",
      tester: "",
    };

    if (!input.plannedOn || !input.tester) {
      setError("Please fill Planned On and Tester for the selected row.");
      return;
    }

    setSavingRow(equipment._id);
    setError(null);
    setRowSuccess(null);

    try {
      const res = await fetch("/api/pms/equipment-testing/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          equipmentId: equipment._id,
          plannedOn: input.plannedOn,
          tester: input.tester,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create test plan");
      }

      setRowSuccess(
        `Test plan created for ${equipment.equipmentCode} (${equipment.equipmentType}).`
      );

      // clear inputs for that row
      setRowInputs((prev) => ({
        ...prev,
        [equipment._id]: {
          plannedOn: "",
          tester: "",
        },
      }));
    } catch (err) {
      console.error("Create test plan error:", err);
      setError(err.message || "Failed to create test plan");
    } finally {
      setSavingRow(null);
    }
  };

  const yearOptions = [];
  for (let y = currentYear - 2; y <= currentYear + 3; y += 1) {
    yearOptions.push(y);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
          PMS / Equipment Testing
        </p>
        <h2 className="text-xl font-bold text-white mt-1">Equipment Testing</h2>
        <p className="text-xs text-slate-200 mt-1">
          Plan annual tests for active equipment. Select a year to see items
          coming due, then enter planned dates and testers.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300">Select Year</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-white/15 bg-slate-900/80 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => loadEquipments(year)}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-sky-400/40 text-sky-200 hover:bg-sky-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Alerts */}
      {(error || rowSuccess) && (
        <div>
          {error && (
            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-100">
              {error}
            </div>
          )}
          {rowSuccess && (
            <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-100">
              {rowSuccess}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">
            Equipment inventory
          </h3>
          <p className="text-[11px] text-slate-400">
            Last updated :{" "}
            <span className="text-slate-200">
              {new Date().toLocaleDateString("en-GB")}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="text-left text-slate-100 border-b border-white/10 bg-slate-900/90">
                <th className="px-4 py-3 font-semibold text-sm">
                  Equipment Type
                </th>
                <th className="px-4 py-3 font-semibold text-sm">
                  Equipment Number
                </th>
                <th className="px-4 py-3 font-semibold text-sm">
                  Last test date
                </th>
                <th className="px-4 py-3 font-semibold text-sm">
                  Next test date
                </th>
                <th className="px-4 py-3 font-semibold text-sm">Planned on</th>
                <th className="px-4 py-3 font-semibold text-sm">Planned tester</th>
                <th className="px-4 py-3 font-semibold text-right text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {equipments.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    No equipment found for {year}. Try a different year.
                  </td>
                </tr>
              )}

              {equipments.map((eq) => {
                const input = rowInputs[eq._id] || {
                  plannedOn: "",
                  tester: "",
                };
                return (
                  <tr
                    key={eq._id}
                    className="border-t border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-white">
                      {eq.equipmentType || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-100">
                      {eq.equipmentCode || "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-100">
                      {formatDate(eq.lastTestDate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-100">
                      {formatDate(eq.nextTestDate)}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="date"
                        value={input.plannedOn}
                        onChange={(e) =>
                          handleInputChange(eq._id, "plannedOn", e.target.value)
                        }
                        className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        placeholder="Tester name"
                        value={input.tester}
                        onChange={(e) =>
                          handleInputChange(eq._id, "tester", e.target.value)
                        }
                        className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handlePlanTest(eq)}
                        disabled={savingRow === eq._id}
                        className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow shadow-emerald-500/40 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        {savingRow === eq._id ? "Saving..." : "Plan test"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
