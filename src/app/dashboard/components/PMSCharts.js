"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

/* chart.js — lazy-loaded so main bundle stays small */
const DoughnutChart = dynamic(
  () =>
    Promise.all([
      import("react-chartjs-2"),
      import("chart.js/auto")
    ]).then(([reactChartJs2]) => {
      // Chart.js/auto automatically registers all components including ArcElement
      return { default: reactChartJs2.Doughnut };
    }),
  { ssr: false, loading: () => <ChartPlaceholder /> }
);

/* ================================================================
   COLOUR PALETTES
   ================================================================ */
const DONUT_COLORS = [
  "#06b6d4",
  "#f472b6",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#facc15",
  "#60a5fa",
  "#f87171",
  "#4ade80",
  "#e879f9",
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function PMSCharts() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pms/dashboard/stats");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Failed to fetch PMS statistics");
      if (!data.data) throw new Error("No data received from API");
      setStats(data.data);
    } catch (err) {
      console.error("PMS Dashboard Fetch Error:", err);
      setError(err.message || "Failed to load PMS statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ---------- Early returns ---------- */
  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
          Error: {error}
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <DashboardSkeleton />
      </div>
    );
  }

  /* ---------- Chart data ---------- */
  const typeLabels = Object.keys(stats.equipmentByType || {});
  const typeValues = Object.values(stats.equipmentByType || {});

  const donutData = {
    labels: typeLabels,
    datasets: [
      {
        data: typeValues,
        backgroundColor: DONUT_COLORS.slice(0, typeLabels.length),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const donutOptions = {
    cutout: "60%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` },
      },
    },
  };

  /* ---------- Retirement chart data ---------- */
  const retirementData = Object.entries(stats.retirement || {}).map(
    ([type, count]) => ({ type, count })
  );

  /* ---------- Stacked bar chart data by location ---------- */
  const locKeys = Object.keys(stats.equipmentByLocation || {});
  const stackedChartData = locKeys.map((loc) => {
    const d = stats.equipmentByLocation[loc] || {};
    return {
      location: formatLocation(loc),
      primaryFenders: d.primaryFenders || 0,
      secondaryFenders: d.secondaryFenders || 0,
      hoses: d.hoses || 0,
      total: (d.primaryFenders || 0) + (d.secondaryFenders || 0) + (d.hoses || 0),
    };
  });
  const maxStackValue = Math.max(...stackedChartData.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader />

      {/* ==================== ROW 1 — STAT CARDS ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Equipment"
          value={stats.totalEquipment}
          gradient="from-cyan-900/40 via-cyan-800/30 to-sky-900/40"
          accent="text-cyan-300"
          icon="🔧"
        />
        <StatCard
          label="Active"
          value={stats.activeEquipment}
          gradient="from-emerald-900/40 via-emerald-800/30 to-teal-900/40"
          accent="text-emerald-300"
          icon="✅"
        />
        <StatCard
          label="In Use"
          value={stats.inUseEquipment}
          gradient="from-orange-900/40 via-orange-800/30 to-red-900/40"
          accent="text-orange-300"
          icon="⚙️"
        />
        <StatCard
          label="Certifications"
          value={stats.totalCertificates}
          gradient="from-violet-900/40 via-violet-800/30 to-purple-900/40"
          accent="text-violet-300"
          icon="📜"
        />
        <StatCard
          label="Upcoming Tests"
          value={stats.upcomingTestDue}
          gradient="from-blue-900/40 via-blue-800/30 to-indigo-900/40"
          accent="text-blue-300"
          icon="🧪"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          gradient="from-red-900/40 via-red-800/30 to-rose-900/40"
          accent="text-red-300"
          icon="⚠️"
        />
      </div>

      {/* ==================== ROW 2 — HOSES / FENDERS / TEST DUE / OVERDUE ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hoses */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-900/40 via-teal-800/30 to-cyan-900/40 backdrop-blur-md shadow-2xl p-6 hover:shadow-teal-500/20 transition-all hover:scale-105">
          <h3 className="text-sm font-semibold text-teal-300 mb-4">
            Total number of Hoses
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Total Hoses</span>
            <span className="text-2xl font-bold text-white">
              {stats.hoses?.total ?? 0}
            </span>
          </div>
        </div>

        {/* Total Fenders */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-900/40 via-indigo-800/30 to-purple-900/40 backdrop-blur-md shadow-2xl p-6 hover:shadow-indigo-500/20 transition-all hover:scale-105">
          <h3 className="text-sm font-semibold text-indigo-300 mb-4">
            Total Number of Fenders
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Primary Fenders</span>
              <span className="text-xl font-bold text-white">
                {stats.fenders?.primary ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Secondary Fenders</span>
              <span className="text-xl font-bold text-white">
                {stats.fenders?.secondary ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Test Due */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-indigo-900/40 backdrop-blur-md shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">
            Upcoming Test Due
          </h3>
          <p className="text-4xl font-bold text-white">
            {stats.upcomingTestDue ?? 0}
          </p>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-cyan-900/40 backdrop-blur-md shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Overdue</h3>
          <p className="text-4xl font-bold text-white">{stats.overdue ?? 0}</p>
        </div>
      </div>

      {/* ==================== ROW 3 — SPARE / DONUT / IN USE ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Usage of Spare */}
        <div className="lg:col-span-3">
          <SpareUsageTable spares={stats.spares || []} />
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md shadow-2xl p-6 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-white/80 mb-4">
              Equipment Distribution
            </h3>
            <div className="flex-1 relative min-h-[260px]">
              {typeLabels.length > 0 ? (
                <DoughnutChart data={donutData} options={donutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-white/40 text-sm">
                  No equipment data
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {typeLabels.map((label, i) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-white/70"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{
                      backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                    }}
                  />
                  {label}{" "}
                  <span className="text-white/40">({typeValues[i]})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment currently in Use */}
        <div className="lg:col-span-5">
          <EquipmentInUseTable items={stats.equipmentInUse || []} />
        </div>
      </div>

      {/* ==================== ROW 4 — WAREHOUSE MOVEMENTS ==================== */}
      <WarehouseMovementTracker movements={stats.warehouseMovements || []} />

      {/* ==================== ROW 5 — FENDERS & HOSES MINI + LOCATION TABLE ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fenders & Hoses summary */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-white/80 mb-4">
            Fenders & Hoses Summary
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <MiniStat
              label="Primary Fenders"
              value={stats.fenders?.primary ?? 0}
              color="text-cyan-400"
            />
            <MiniStat
              label="Secondary Fenders"
              value={stats.fenders?.secondary ?? 0}
              color="text-purple-400"
            />
            <MiniStat
              label="Hoses"
              value={stats.hoses?.total ?? 0}
              color="text-orange-400"
            />
          </div>
        </div>

        {/* Equipment By Location (table) */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-white/80 mb-4">
            Equipment by Location
          </h3>
          {locKeys.length > 0 ? (
            <div className="overflow-x-auto max-h-48 overflow-y-auto styled-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="text-white/50 border-b border-white/10">
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 px-3 text-center">Primary</th>
                    <th className="py-2 px-3 text-center">Secondary</th>
                    <th className="py-2 pl-3 text-center">Hoses</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.equipmentByLocation).map(
                    ([loc, vals]) => (
                      <tr
                        key={loc}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="py-2 pr-3 text-white/80 font-medium">
                          {formatLocation(loc)}
                        </td>
                        <td className="py-2 px-3 text-center text-cyan-300">
                          {vals.primaryFenders}
                        </td>
                        <td className="py-2 px-3 text-center text-purple-300">
                          {vals.secondaryFenders}
                        </td>
                        <td className="py-2 pl-3 text-center text-orange-300">
                          {vals.hoses}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-white/40 text-sm">No location data available</p>
          )}
        </div>
      </div>

      {/* ==================== ROW 6 — RETIREMENT + STACKED BAR (BY LOCATION) ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retirement of equipment */}
        <div className="lg:col-span-1 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Retirement of equipment
          </h2>
          <div className="space-y-4">
            {retirementData.length > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-xs text-slate-300">
                      Primary Fender
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-xs text-slate-300">LPG Hose</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {retirementData.map((item, idx) => {
                    const maxRetirement = Math.max(
                      ...retirementData.map((d) => d.count),
                      1
                    );
                    const width = (item.count / maxRetirement) * 100;
                    const colors = [
                      "#f97316",
                      "#eab308",
                      "#3b82f6",
                      "#8b5cf6",
                    ];
                    return (
                      <div key={item.type} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">
                            {item.type}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {item.count}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${width}%`,
                              backgroundColor: colors[idx % colors.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No retired equipment
              </div>
            )}
          </div>
        </div>

        {/* Stacked Bar Chart — Equipment by Location */}
        <div className="lg:col-span-2 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Equipment by Location
          </h2>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-xs text-slate-300">P.Fender</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-xs text-slate-300">S.Fender</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-xs text-slate-300">LPG Hose</span>
            </div>
          </div>
          <div className="h-80 flex items-end justify-around gap-2 px-2">
            {stackedChartData.length > 0 ? (
              stackedChartData.map((data) => {
                const primaryH = (data.primaryFenders / maxStackValue) * 100;
                const secondaryH =
                  (data.secondaryFenders / maxStackValue) * 100;
                const hosesH = (data.hoses / maxStackValue) * 100;
                return (
                  <div
                    key={data.location}
                    className="flex-1 flex flex-col items-center gap-1 h-full"
                  >
                    <div
                      className="w-full flex flex-col-reverse gap-0.5 relative"
                      style={{ height: "100%" }}
                    >
                      {hosesH > 0 && (
                        <div
                          className="w-full bg-purple-400 rounded-t"
                          style={{
                            height: `${hosesH}%`,
                            minHeight: "2px",
                          }}
                        />
                      )}
                      {secondaryH > 0 && (
                        <div
                          className="w-full bg-green-400"
                          style={{
                            height: `${secondaryH}%`,
                            minHeight: "2px",
                          }}
                        />
                      )}
                      {primaryH > 0 && (
                        <div
                          className="w-full bg-cyan-400 rounded-b"
                          style={{
                            height: `${primaryH}%`,
                            minHeight: "2px",
                          }}
                        />
                      )}
                      {data.total > 0 && (
                        <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-white whitespace-nowrap">
                          {data.total}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-300 text-center leading-tight mt-1">
                      {data.location}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center w-full text-white/40 text-sm">
                No location data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function SectionHeader() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white">PMS</h2>
      <p className="text-sm text-slate-300">Planned Maintenance System</p>
    </div>
  );
}

function StatCard({ label, value, gradient, accent, icon }) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-gradient-to-br ${gradient} backdrop-blur-md shadow-2xl p-5 hover:shadow-lg transition-all hover:scale-[1.03] cursor-default`}
    >
      <div className="mb-2">
        <h3
          className={`text-xs font-semibold ${accent} uppercase tracking-wider`}
        >
          {label}
        </h3>
      </div>
      <p className="text-3xl font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

/* ---------- Usage of Spare Table ---------- */
function SpareUsageTable({ spares }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md shadow-2xl h-full flex flex-col">
      <div className="bg-gradient-to-r from-cyan-800/60 to-sky-900/60 rounded-t-2xl px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-cyan-100 tracking-wide">
          Usage of Spare
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto styled-scrollbar">
        {spares.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-400/20 bg-cyan-950/30">
                <th className="text-left px-5 py-2.5 text-cyan-200/80 font-semibold text-xs">
                  Item
                </th>
                <th className="text-center px-5 py-2.5 text-cyan-200/80 font-semibold text-xs">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {spares.map((s, i) => (
                <tr
                  key={s._id || i}
                  className="border-b border-white/5 hover:bg-white/5 transition"
                >
                  <td className="px-5 py-3 text-white/90 font-medium">
                    {s.equipmentName}
                  </td>
                  <td className="px-5 py-3 text-center text-white font-bold">
                    {s.quantity ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center py-10 text-white/40 text-sm">
            No spare data available
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Equipment currently in Use ---------- */
function EquipmentInUseTable({ items }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md shadow-2xl h-full flex flex-col">
      <div className="bg-gradient-to-r from-orange-600/70 to-orange-700/70 rounded-t-2xl px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-orange-50 tracking-wide">
          Equipment Currently In Use
        </h3>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[340px] styled-scrollbar">
        {items.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-orange-950/50 z-10">
              <tr className="border-b border-orange-400/20">
                <th className="text-left px-4 py-2.5 text-orange-200/80 font-semibold whitespace-nowrap">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-orange-200/80 font-semibold whitespace-nowrap">
                  Ops
                </th>
                <th className="text-left px-4 py-2.5 text-orange-200/80 font-semibold whitespace-nowrap">
                  Equipment
                </th>
                <th className="text-left px-4 py-2.5 text-orange-200/80 font-semibold whitespace-nowrap">
                  Type
                </th>
                <th className="text-left px-4 py-2.5 text-orange-200/80 font-semibold whitespace-nowrap">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/5 transition"
                >
                  <td className="px-4 py-2.5 text-white/70 whitespace-nowrap">
                    {item.date
                      ? new Date(item.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 text-[10px] font-semibold">
                      {item.operationRef || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-white/90 font-medium whitespace-nowrap">
                    {item.equipmentName}
                  </td>
                  <td className="px-4 py-2.5 text-white/60 whitespace-nowrap">
                    {item.equipmentType}
                  </td>
                  <td className="px-4 py-2.5 text-white/60 whitespace-nowrap">
                    {item.location}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center py-10 text-white/40 text-sm">
            No equipment currently in use
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Current Warehouse Movement ---------- */
function WarehouseMovementTracker({ movements }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md shadow-2xl p-6">
      <h3 className="text-sm font-semibold text-white/80 mb-5">
        Current Warehouse Movement
      </h3>
      {movements.length > 0 ? (
        <div className="space-y-6">
          {movements.map((m) => (
            <MovementRow key={m._id} movement={m} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 text-white/40 text-sm">
          No active movements
        </div>
      )}
    </div>
  );
}

function MovementRow({ movement }) {
  const from = formatLocation(movement.fromLocation);
  const stop = movement.stopover ? formatLocation(movement.stopover) : null;
  const to = formatLocation(movement.toLocation);

  return (
    <div className="pt-2 pb-3">
      {/* Equipment info row */}
      <div className="flex items-center gap-3 mb-5 ml-1">
        <span className="text-xs text-white/60 font-medium">
          {movement.equipment}
          {movement.equipmentType ? ` · ${movement.equipmentType}` : ""}
        </span>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
          {movement.nos} unit{movement.nos > 1 ? "s" : ""}
        </span>
        {movement.startDate && (
          <span className="text-[10px] text-white/35">
            {new Date(movement.startDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Track — dots + dashed line + truck */}
      <div className="relative px-2">
        {/* ---- Track base line (spans between From and To dots) ---- */}
        <div
          className="absolute top-[7px] h-[3px] rounded-full"
          style={{
            left: "40px",
            right: "40px",
            background: "linear-gradient(90deg, rgba(100,116,139,0.6), rgba(100,116,139,0.4))",
          }}
        >
          {/* dashed overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(148,163,184,0.4) 6px, rgba(148,163,184,0.4) 12px)",
            }}
          />
        </div>

        {/* Truck icon — sits on the line between From dot and next stop */}
        <div
          className="absolute z-10"
          style={{
            left: "65px",
            top: "-8px",
          }}
        >
          <span
            className="text-base leading-none drop-shadow-lg"
            style={{
              transform: "scaleX(-1)",
              display: "inline-block",
              filter: "drop-shadow(0 0 4px rgba(239,68,68,0.4))",
            }}
          >
            🚛
          </span>
        </div>

        {/* ---- Dot + label row ---- */}
        <div className="relative flex items-start">
          {/* From */}
          <div className="flex flex-col items-center z-[1]" style={{ minWidth: 80 }}>
            <div className="w-[16px] h-[16px] rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] border-2 border-red-400" />
            <span className="text-[11px] text-white/70 font-medium mt-2 whitespace-nowrap flex items-center gap-1">
              {from} <span className="text-white/30 text-[10px]">▼</span>
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stopover (if exists) */}
          {stop && (
            <>
              <div className="flex flex-col items-center z-[1]" style={{ minWidth: 80 }}>
                <div className="w-[14px] h-[14px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] border-2 border-emerald-300 mt-[1px]" />
                <span className="text-[11px] text-white/70 font-medium mt-2 whitespace-nowrap flex items-center gap-1">
                  {stop} <span className="text-white/30 text-[10px]">▼</span>
                </span>
              </div>
              <div className="flex-1" />
            </>
          )}

          {/* To */}
          <div className="flex flex-col items-center z-[1]" style={{ minWidth: 80 }}>
            <div className="w-[14px] h-[14px] rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] border-2 border-emerald-400 mt-[1px]" />
            <span className="text-[11px] text-white/70 font-medium mt-2 whitespace-nowrap flex items-center gap-1">
              {to} <span className="text-white/30 text-[10px]">▼</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Skeleton ---------- */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 h-24"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 h-32"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/5 h-72" />
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-white/5 h-72" />
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-white/5 h-72" />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 h-40" />
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full min-h-[260px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
    </div>
  );
}

/* ================================================================
   HELPERS
   ================================================================ */
function formatLocation(loc) {
  if (!loc) return "—";
  return loc
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLpg\b/g, "LPG");
}
