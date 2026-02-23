"use client";

import { useState, useEffect } from "react";

export default function PMSCharts() {
  const [stats, setStats] = useState({
    hoses: { total: 0 },
    fenders: { primary: 0, secondary: 0, total: 0 },
    upcomingTestDue: 0,
    overdue: 0,
    retirement: {},
    equipmentByLocation: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pms/dashboard/stats");
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("PMS Dashboard API Response:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch PMS statistics");
      }

      if (data.data) {
        setStats(data.data);
      } else {
        throw new Error("No data received from API");
      }
    } catch (err) {
      console.error("PMS Dashboard Fetch Error:", err);
      setError(err.message || "Failed to load PMS statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Retirement chart data
  const retirementData = Object.entries(stats.retirement || {}).map(([type, count]) => ({
    type,
    count,
  }));

  // Stacked bar chart data by location
  const locations = ["DUBAI", "SOHAR", "FUJAIRAH", "YEOSU", "MOMBASA", "TANJUNG_BRUAS"];
  const locationLabels = {
    DUBAI: "Dubai",
    SOHAR: "Sohar",
    FUJAIRAH: "Fujairah",
    YEOSU: "Yeosu",
    MOMBASA: "Mombasa",
    TANJUNG_BRUAS: "Tanjung Bruas",
  };

  const stackedChartData = locations.map((loc) => {
    const data = stats.equipmentByLocation[loc] || {
      primaryFenders: 0,
      secondaryFenders: 0,
      hoses: 0,
    };
    return {
      location: locationLabels[loc] || loc,
      primaryFenders: data.primaryFenders || 0,
      secondaryFenders: data.secondaryFenders || 0,
      hoses: data.hoses || 0,
      total: (data.primaryFenders || 0) + (data.secondaryFenders || 0) + (data.hoses || 0),
    };
  });

  const maxStackValue = Math.max(...stackedChartData.map((d) => d.total), 1);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">PMS</h2>
          <p className="text-sm text-slate-300">Planned Maintenance System</p>
        </div>
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
          Error: {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">PMS</h2>
          <p className="text-sm text-slate-300">Planned Maintenance System</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">PMS</h2>
        <p className="text-sm text-slate-300">Planned Maintenance System</p>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hoses */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-teal-900/40 via-teal-800/30 to-cyan-900/40 backdrop-blur-md shadow-2xl p-6 hover:shadow-teal-500/20 transition-all hover:scale-105">
          <h3 className="text-sm font-semibold text-teal-300 mb-4">Total number of Hoses</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Total Hoses</span>
              <span className="text-2xl font-bold text-white">{stats.hoses.total}</span>
            </div>
          </div>
        </div>

        {/* Total Fenders */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-indigo-900/40 via-indigo-800/30 to-purple-900/40 backdrop-blur-md shadow-2xl p-6 hover:shadow-indigo-500/20 transition-all hover:scale-105">
          <h3 className="text-sm font-semibold text-indigo-300 mb-4">Total Number of Fenders</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Primary Fenders</span>
              <span className="text-xl font-bold text-white">{stats.fenders.primary}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Secondary Fenders</span>
              <span className="text-xl font-bold text-white">{stats.fenders.secondary}</span>
            </div>
          </div>
        </div>

        {/* Upcoming Test Due */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-indigo-900/40 backdrop-blur-md shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-purple-300 mb-2">Upcoming Test Due</h3>
          <p className="text-4xl font-bold text-white">{stats.upcomingTestDue}</p>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-cyan-900/40 backdrop-blur-md shadow-2xl p-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Overdue</h3>
          <p className="text-4xl font-bold text-white">{stats.overdue}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retirement of equipment - Horizontal Bar Chart */}
        <div className="lg:col-span-1 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Retirement of equipment</h2>
          <div className="space-y-4">
            {retirementData.length > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-slate-300">Primary Fender</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-slate-300">LPG Hose</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {retirementData.map((item, idx) => {
                    const maxRetirement = Math.max(...retirementData.map((d) => d.count), 1);
                    const width = (item.count / maxRetirement) * 100;
                    const colors = ["#f97316", "#eab308", "#3b82f6", "#8b5cf6"];
                    return (
                      <div key={item.type} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">{item.type}</span>
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${width}%`,
                              backgroundColor: colors[idx % colors.length],
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">No retired equipment</div>
            )}
          </div>
        </div>

        {/* Stacked Bar Chart - Equipment by Location */}
        <div className="lg:col-span-2 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Equipment by Location</h2>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-xs text-slate-300">P.Fender</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-xs text-slate-300">S.Fender</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              <span className="text-xs text-slate-300">LPG Hose</span>
            </div>
          </div>
          <div className="h-80 flex items-end justify-around gap-2 px-2">
            {stackedChartData.map((data, idx) => {
              const primaryHeight = (data.primaryFenders / maxStackValue) * 100;
              const secondaryHeight = (data.secondaryFenders / maxStackValue) * 100;
              const hosesHeight = (data.hoses / maxStackValue) * 100;
              return (
                <div key={data.location} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="w-full flex flex-col-reverse gap-0.5 relative" style={{ height: "100%" }}>
                    {/* Hoses */}
                    {hosesHeight > 0 && (
                      <div
                        className="w-full bg-purple-400 rounded-t"
                        style={{ height: `${hosesHeight}%`, minHeight: hosesHeight > 0 ? "2px" : "0" }}
                      ></div>
                    )}
                    {/* Secondary Fenders */}
                    {secondaryHeight > 0 && (
                      <div
                        className="w-full bg-green-400"
                        style={{ height: `${secondaryHeight}%`, minHeight: secondaryHeight > 0 ? "2px" : "0" }}
                      ></div>
                    )}
                    {/* Primary Fenders */}
                    {primaryHeight > 0 && (
                      <div
                        className="w-full bg-cyan-400 rounded-b"
                        style={{ height: `${primaryHeight}%`, minHeight: primaryHeight > 0 ? "2px" : "0" }}
                      ></div>
                    )}
                    {/* Total value label */}
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
