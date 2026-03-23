"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useOperationsLoading } from "@/app/operations/OperationsLoadingContext";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";
import {
  ActionViewIconLink,
  ActionEditIconLink,
  ActionDeleteIcon,
} from "@/app/components/RecordActionIcons";

const sidebarTabs = [
  { key: "documentation", label: "Documentation", href: "/operations/sts-operations/new" },
  { key: "compatibility", label: "Compatibility", href: "/operations/sts-operations/new/compatibility" },
  {
    key: "forms",
    label: "Forms and checklist",
    submodules: [
      { key: "sts-checklist", label: "STS Checklist", href: "/operations/sts-operations/new/form-checklist/sts-checklist" },
      { key: "jpo", label: "JPO", href: "/operations/sts-operations/new/form-checklist/jpo/form" },
      { key: "quotation", label: "Quotation", href: "/operations/sts-operations/new/form-checklist/quotations/form" },
      { key: "inspection-checklist", label: "Inspection Checklist", href: "/operations/sts-operations/new/form-checklist/inspection-checklist/form" },
      { key: "manual", label: "Manual", href: "/operations/sts-operations/new/form-checklist/manual/form" },
    ],
  },
  { key: "cargos", label: "Cargo types", href: "/operations/sts-operations/new/cargos" },
  { key: "locations", label: "Locations", href: "/operations/sts-operations/new/locations" },
  { key: "mooring", label: "Mooring masters", href: "/operations/sts-operations/new/mooringmaster" },
];

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function CompatibilityListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen } = useOperationsSidebar();
  const [activeTab, setActiveTab] = useState("compatibility");
  const [expandedModules, setExpandedModules] = useState(new Set());
  const sidebarRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [locationId, setLocationId] = useState("");
  const { setPageLoading } = useOperationsLoading();

  useEffect(() => {
    fetch("/api/master/locations/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.locations) setLocations(data.locations);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setPageLoading(true);
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (locationId) params.set("locationId", locationId);
    fetch(`/api/operations/compatibility/list?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRecords(data.data || []);
        else setError(data.error || "Failed to load");
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setPageLoading(false);
      });
  }, [year, locationId, setPageLoading]);

  const initialYears = getYears();

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Sidebar - same as compatibility form */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full w-[260px] sm:w-[300px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/20 shadow-2xl backdrop-blur-md z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h2 className="text-lg font-bold text-white">Operations Modules</h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition hover:scale-110"
              aria-label="Close sidebar"
            >
              <span className="text-white text-lg">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1.5">
              {sidebarTabs.map((tab) => (
                <div key={tab.key} className="space-y-1">
                  {tab.submodules ? (
                    <>
                      <button
                        onClick={() => {
                          setExpandedModules((prev) => {
                            const next = new Set(prev);
                            if (next.has(tab.key)) next.delete(tab.key);
                            else next.add(tab.key);
                            return next;
                          });
                        }}
                        className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                          activeTab === tab.key ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" : "text-white/90 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex-1">{tab.label}</span>
                        <span className={`text-sm transition-transform ${expandedModules.has(tab.key) ? "rotate-90" : ""}`}>▶</span>
                      </button>
                      {expandedModules.has(tab.key) && (
                        <div className="ml-4 space-y-1 mt-1.5 pl-4 border-l-2 border-orange-500/30">
                          {tab.submodules.map((sub) => (
                            <Link
                              key={sub.key}
                              href={sub.href}
                              className="block w-full text-left px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={tab.href}
                      className={`block px-4 py-3 rounded-xl text-base font-medium ${
                        activeTab === tab.key ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white" : "text-white/90 hover:bg-white/10"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/10 bg-slate-800/50">
            <p className="text-[10px] text-slate-400 text-center">Operations Management System</p>
          </div>
        </div>
      </div>

      {!isSidebarOpen && (
        <div className="fixed left-4 top-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition border border-orange-400/30 shadow-lg shadow-orange-500/30 hover:scale-110"
            aria-label="Open sidebar"
          >
            <span className="text-white text-xl">☰</span>
          </button>
          <Link
            href="/dashboard"
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
        </div>
      )}

      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
        <div className={`w-full mx-auto py-6 sm:py-10 space-y-4 sm:space-y-6 ${isSidebarOpen ? "max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4" : "px-3 sm:px-6"}`}>
          <header className="mt-12 md:mt-0 space-y-4">
            {/* First Row: Dashboard Button, Heading, Action Buttons */}
            <div className="flex items-center gap-4">
            {/* Left: Dashboard */}
            <Link
              href="/dashboard"
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
            >
              ← Dashboard
            </Link>

            {/* Center: Heading */}
            <div className="flex-1 flex flex-col items-center text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Operations / Compatibility</p>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Compatibility List</h1>
              <p className="text-xs text-slate-200 mt-1">View operations by year and location</p>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
                <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                  <Link href="/operations/sts-operations/new/compatibility?section=hose" className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition">
                    Hose Calculation
                  </Link>
                  <Link href="/operations/sts-operations/new/compatibility?section=fender" className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition">
                    Fender Calculation
                  </Link>
                  <Link href="/operations/sts-operations/new/compatibility/list" className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition">
                    List
                  </Link>
                </div>
              </div>
            </div>

            {/* Second Row: Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
                <select
                  className="rounded-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-white"
                  value={year || ""}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {initialYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Location</span>
                <select
                  className="rounded-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-white"
                  value={locationId || ""}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">All locations</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 overflow-hidden p-12 text-center text-white/90" style={{ backgroundColor: "#2C4257" }}>
              Loading...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-white/10 overflow-hidden p-12 text-center" style={{ backgroundColor: "#2C4257" }}>
              <p className="text-white/90">No operations found for the selected year and location.</p>
              <Link href="/operations/sts-operations/new/compatibility" className="mt-4 inline-block px-6 py-3 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition">
                Add New Operation
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl" style={{ backgroundColor: "#2C4257" }}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="border-b border-white/10" style={{ backgroundColor: "#23374D" }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Operation No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">STBL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">SS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Calculation type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-white/90 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {records.map((rec, index) => {
                      const hasHose = rec.results?.hose?.HoseCal != null || rec.results?.hose?.FreeboardDiff != null;
                      const hasFender = rec.results?.fender?.EDC != null || rec.results?.fender?.Fenderselect_Calm;
                      const typeLabel = hasHose ? "Hose Calculation" : hasFender ? "Fender Calculation" : "—";
                      return (
                        <tr key={rec._id} className="hover:opacity-90 transition-opacity" style={{ backgroundColor: index % 2 === 0 ? "#2C4257" : "#23374D" }}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-white">{rec.operationNumber || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white/90">{rec.year ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white/90">{rec.location?.name || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white/90">{rec.STBL?.name || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white/90">{rec.SS?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-white/90">{typeLabel}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <ActionViewIconLink
                                href={`/operations/sts-operations/new/compatibility/view/${rec._id}`}
                                title="View"
                              />
                              <ActionEditIconLink
                                href={`/operations/sts-operations/new/compatibility?edit=${rec._id}`}
                                title="Edit"
                              />
                              <ActionDeleteIcon
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to delete operation ${rec.operationNumber}? This action cannot be undone.`)) {
                                    return;
                                  }
                                  setDeleting(rec._id);
                                  try {
                                    const res = await fetch(`/api/operations/compatibility/${rec._id}/delete`, { method: "DELETE" });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || "Failed to delete");
                                    const fetchRecords = async () => {
                                      const params = new URLSearchParams();
                                      if (year) params.set("year", year);
                                      if (locationId) params.set("locationId", locationId);
                                      const url = `/api/operations/compatibility/list${params.toString() ? `?${params.toString()}` : ""}`;
                                      const res2 = await fetch(url);
                                      const data2 = await res2.json();
                                      if (res2.ok) setRecords(data2.data || []);
                                    };
                                    await fetchRecords();
                                  } catch (err) {
                                    setError(err.message);
                                  } finally {
                                    setDeleting(null);
                                  }
                                }}
                                disabled={deleting === rec._id}
                                loading={deleting === rec._id}
                                title="Delete"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
