"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useOperationsLoading } from "@/app/operations/OperationsLoadingContext";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";

const sidebarTabs = [
  {
    key: "documentation",
    label: "Documentation",
    href: "/operations/sts-operations/new",
  },
  {
    key: "compatibility",
    label: "Compatibility",
    href: "/operations/sts-operations/new/compatibility",
  },
  {
    key: "forms",
    label: "Forms and checklist",
    submodules: [
      {
        key: "sts-checklist",
        label: "STS Checklist",
        href: "/operations/sts-operations/new/form-checklist/sts-checklist",
      },
      {
        key: "jpo",
        label: "JPO",
        href: "/operations/sts-operations/new/form-checklist/jpo/form",
      },
      {
        key: "quotation",
        label: "Quotation",
        href: "/operations/sts-operations/new/form-checklist/quotations/sts-form",
      },
      {
        key: "inspection-checklist",
        label: "Inspection Checklist",
        href: "/operations/sts-operations/new/form-checklist/inspection-checklist/form",
      },
      {
        key: "manual",
        label: "Manual",
        href: "/operations/sts-operations/new/form-checklist/manual/form",
      },
    ],
  },
  {
    key: "cargos",
    label: "Cargo types",
    href: "/operations/sts-operations/new/cargos",
  },
  {
    key: "locations",
    label: "Locations",
    href: "/operations/sts-operations/new/locations",
  },
  {
    key: "mooring",
    label: "Mooring masters",
    href: "/operations/sts-operations/new/mooringmaster",
  },
];

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

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function InspectionChecklistListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  const { isSidebarOpen, setIsSidebarOpen } = useOperationsSidebar();
  const [activeTab, setActiveTab] = useState("forms");
  const [expandedModules, setExpandedModules] = useState(new Set(["forms"]));
  const sidebarRef = useRef(null);
  
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [year, setYear] = useState(currentYear);
  const [locationId, setLocationId] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [filterYear, setFilterYear] = useState(""); // For form 013 year filter
  const [boatName, setBoatName] = useState("");
  const { setPageLoading } = useOperationsLoading();

  const FORM_NUMBERS = [
    { value: "", label: "All Forms" },
    { value: "OPS-OFD-010", label: "OPS-OFD-010" },
    { value: "OPS-OFD-012", label: "OPS-OFD-012" },
    { value: "OPS-OFD-006", label: "OPS-OFD-006" },
    { value: "OPS-OFD-013", label: "OPS-OFD-013" },
    { value: "OPS-OFD-027", label: "OPS-OFD-027" },
    { value: "OPS-OFD-028", label: "OPS-OFD-028" },
  ];

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/master/locations/list");
        const data = await res.json();
        if (res.ok && data.locations) {
          setLocations(data.locations);
        }
      } catch (err) {
        console.error("Failed to load locations:", err);
      }
    };
    fetchLocations();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    setPageLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.set("year", year);
      if (locationId) params.set("locationId", locationId);
      if (formNumber) params.set("formNumber", formNumber);
      if (formNumber === "OPS-OFD-013") {
        if (filterYear) params.set("filterYear", filterYear);
        if (boatName) params.set("boatName", boatName);
      }
      const url = `/api/operations/form-checklist/inspection-checklist/list${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load records");
      }
      setRecords(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [year, locationId, formNumber, filterYear, boatName]);

  const handleDownload = async (record) => {
    setDownloading(record._id);
    try {
      const res = await fetch(
        `/api/operations/form-checklist/inspection-checklist/${record._id}/download`
      );

      if (!res.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.filePath.split("/").pop() || `inspection-checklist-v${record.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  const handleEdit = (record) => {
    router.push(`/operations/sts-operations/new/form-checklist/inspection-checklist/form?edit=${record._id}`);
  };

  const handleDelete = async (record) => {
    if (!confirm(`Are you sure you want to delete this record (${record.formCode || "N/A"})? This action cannot be undone.`)) {
      return;
    }

    setDeleting(record._id);
    try {
      const res = await fetch(
        `/api/operations/form-checklist/inspection-checklist/${record._id}/delete`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete record");
      }

      // Refresh the list
      fetchRecords();
    } catch (err) {
      setError(err.message || "Failed to delete record");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex">
        <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
          <div className="flex items-center justify-center h-screen">
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/20 shadow-2xl backdrop-blur-md z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "300px" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
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

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent transition-all duration-200">
            <div className="space-y-1.5">
              {sidebarTabs.map((tab) => (
                <div key={tab.key} className="space-y-1">
                  {tab.submodules ? (
                    <>
                      <button
                        onClick={() => {
                          setExpandedModules((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(tab.key)) {
                              newSet.delete(tab.key);
                            } else {
                              newSet.add(tab.key);
                            }
                            return newSet;
                          });
                        }}
                        className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                          activeTab === tab.key
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 scale-[1.02]"
                            : "text-white/90 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="flex-1">{tab.label}</span>
                        <span
                          className={`text-sm transition-transform ${
                            expandedModules.has(tab.key) ? "rotate-90" : ""
                          }`}
                        >
                          ▶
                        </span>
                        {activeTab === tab.key && (
                          <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                        )}
                      </button>
                      {expandedModules.has(tab.key) && (
                        <div className="ml-4 space-y-1 mt-1.5 pl-4 border-l-2 border-orange-500/30">
                          {tab.submodules.map((submodule) => {
                            const basePath = submodule.href.replace(/\/form$|\/list$/, "") || submodule.href;
                            const pathNorm = pathname.replace(/\/$/, "");
                            const isActiveSub =
                              pathNorm === basePath ||
                              pathNorm.startsWith(basePath + "/form") ||
                              pathNorm.startsWith(basePath + "/list");
                            return (
                              <Link
                                key={submodule.key}
                                href={submodule.href}
                                className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                                  isActiveSub
                                    ? "bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white border-orange-400 shadow-lg"
                                    : "text-white/80 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-xs">▸</span>
                                  {submodule.label}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={tab.href}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                        activeTab === tab.key
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 scale-[1.02]"
                          : "text-white/90 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 hover:scale-[1.01]"
                      }`}
                    >
                      <span className="flex-1">{tab.label}</span>
                      {activeTab === tab.key && (
                        <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-slate-800/50">
            <p className="text-[10px] text-slate-400 text-center">
              Operations Management System
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition border border-orange-400/30 shadow-lg shadow-orange-500/30 hover:scale-110"
          aria-label="Open sidebar"
        >
          <span className="text-white text-xl">☰</span>
        </button>
      )}

      {/* Main Content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
        <div className={`mx-auto py-10 space-y-6 ${isSidebarOpen ? "max-w-[95%] pl-4 pr-4" : "px-6"}`}>
        <header className="flex items-center gap-4">
          {/* Left: Dashboard Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition duration-200 hover:translate-y-[1px] flex-shrink-0"
          >
            ← Dashboard
          </Link>
          
          {/* Center: Heading */}
          <div className="flex-1 flex flex-col items-center text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              Operations / Forms & Checklist / Inspection Checklist
            </p>
            <h1 className="text-2xl font-bold text-white">Inspection Checklist</h1>
            <p className="text-xs text-slate-200 mt-1">
              View and manage all Inspection Checklist records
            </p>
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/operations/sts-operations/new/form-checklist/inspection-checklist/form"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Inspection Checklist Form
              </Link>
              <Link
                href="/operations/sts-operations/new/form-checklist/inspection-checklist/list"
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Inspection Checklist List
              </Link>
            </div>
          </div>
        </header>

        {/* Filters Row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Year
            </span>
            <select
              className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white"
              value={year || ""}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {initialYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Form Number
            </span>
            <select
              className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white min-w-[150px]"
              value={formNumber || ""}
              onChange={(e) => {
                setFormNumber(e.target.value);
                if (e.target.value !== "OPS-OFD-013") {
                  setFilterYear("");
                  setBoatName("");
                }
              }}
            >
              {FORM_NUMBERS.map((form) => (
                <option key={form.value} value={form.value}>
                  {form.label}
                </option>
              ))}
            </select>
          </div>
          {formNumber === "OPS-OFD-013" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                  Year (Form 013)
                </span>
                <select
                  className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white"
                  value={filterYear || ""}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value="">All Years</option>
                  {initialYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                  Boat Name
                </span>
                <input
                  type="text"
                  placeholder="Filter by boat name"
                  className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white placeholder:text-white/40 min-w-[120px]"
                  value={boatName}
                  onChange={(e) => setBoatName(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Location
            </span>
            <select
              className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white min-w-[150px]"
              value={locationId || ""}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {records.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/60">No records found for the selected year.</p>
            <Link
              href="/operations/sts-operations/new/form-checklist/inspection-checklist/form"
              className="mt-4 inline-block px-6 py-3 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition"
            >
              Upload New Record
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Form Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Version
                    </th>
                    {formNumber === "OPS-OFD-013" && (
                      <>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                          Boat Name
                        </th>
                      </>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Uploaded By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Uploaded At
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-white/90 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-orange-400">
                          {record.formCode || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white/90">v{record.version}</span>
                      </td>
                      {formNumber === "OPS-OFD-013" && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-white/90">
                              {record.year || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-white/90">
                              {record.boatName || "—"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white/90">
                          {formatDate(record.date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white/90">
                          {record.location?.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white/90">
                          {record.uploadedBy?.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white/90">
                          {formatDate(record.uploadedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(record)}
                            disabled={downloading === record._id}
                            className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-medium hover:bg-sky-500/30 transition disabled:opacity-50"
                          >
                            {downloading === record._id ? "Downloading..." : "Download"}
                          </button>
                          <button
                            onClick={() => handleEdit(record)}
                            className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-medium hover:bg-orange-500/30 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            disabled={deleting === record._id}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === record._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

