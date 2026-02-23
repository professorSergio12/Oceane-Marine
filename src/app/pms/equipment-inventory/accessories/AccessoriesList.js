"use client";

import { useEffect, useState } from "react";

// Generate years: 2 years back, current year, and 5 years forward
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

export default function AccessoriesList({ onViewChange }) {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, REGULAR, OCCASIONAL

  // Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await fetch(`/api/pms/equipment-inventory/accessories/list`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.years) && data.years.length > 0) {
          setYears(data.years);
          setYear(data.years[0]);
        }
      } catch (err) {
        // ignore years fetch error
      }
    };
    fetchYears();
  }, []);

  // Fetch accessories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const category = activeTab !== "ALL" ? activeTab : null;
        const url = `/api/pms/equipment-inventory/accessories/list?year=${year}${category ? `&category=${category}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load accessories");
        setAccessories(data.data || []);
      } catch (err) {
        setError(err.message || "Failed to load accessories");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Accessories Inventory</h2>
          <p className="text-sm text-white/60">List View</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Year
            </span>
            <select
              className="rounded-full px-3 py-1 text-xs tracking-widest uppercase bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {(years.length ? years : getYears()).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "ALL"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("REGULAR")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "REGULAR"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          Regular
        </button>
        <button
          onClick={() => setActiveTab("OCCASIONAL")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "OCCASIONAL"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          Occasional
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
          {error}
        </div>
      )}

      {/* List Content */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-white/60">Loading accessories...</p>
          </div>
        ) : accessories.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-white/60">No accessories found for the selected year and category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs uppercase tracking-wide text-slate-300 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3">Equipment No</th>
                  <th className="px-4 py-3">Equipment Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Placed In</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3">Put in Use</th>
                  <th className="px-4 py-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {accessories.map((item) => (
                  <tr key={item._id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">
                      {item.equipmentNo || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {item.equipmentName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        item.category === "REGULAR"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}>
                        {item.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        item.status === "ACTIVE"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}>
                        {item.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {item.quantity || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {item.placedIn || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {formatDate(item.purchaseDate)}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {item.putInUse ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-white/90">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
