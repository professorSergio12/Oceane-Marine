"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";

/** Map every OPS-OFD code to a human-readable form name */
const FORM_NAME_MAP = {
  "OPS-OFD-001":  "Checklist 1",
  "OPS-OFD-001-A":"Ship Standard Questionnaire",
  "OPS-OFD-002":  "Checklist 2",
  "OPS-OFD-003":  "Checklist 3A & B",
  "OPS-OFD-004":  "Checklist 4A-F",
  "OPS-OFD-005":  "Checklist 5A-C",
  "OPS-OFD-005B": "Checklist 6A & B",
  "OPS-OFD-005C": "Checklist 7",
  "OPS-OFD-005E": "Declaration at Sea",
  "OPS-OFD-005F": "Checklist 5F",
  "OPS-OFD-008":  "Checklist 8",
  "OPS-OFD-009":  "Mooring Master Job Report",
  "OPS-OFD-011":  "Standing Order",
  "OPS-OFD-014":      "STS Equipment Checklist",
  "OPS-OFD-014-B":    "Equip Checklist (Before Op.)",
  "OPS-OFD-014-A":    "Equip Checklist (After Op.)",
  "OPS-OFD-015":      "Hourly Checks",
  "OPS-OFD-018":      "STS Timesheet",
  "OPS-OFD-020":      "Master's Feedback",
  "OPS-OFD-020-CHS":  "Master's Feedback (CHS)",
  "OPS-OFD-020-MS":   "Master's Feedback (MS)",
  "OPS-OFD-023":      "Rest Hours CKL",
  "OPS-OFD-029":      "Mooring Master Expense Sheet",
};

const statusTone = {
  INPROGRESS: {
    dot: "bg-sky-600",
    pill: "bg-sky-500/80 border-sky-400/40 text-sky-100",
  },
  COMPLETED: {
    dot: "bg-emerald-600",
    pill: "bg-emerald-500/80 border-emerald-400/40 text-emerald-100",
  },
  "Lined Up": {
    dot: "bg-amber-600",
    pill: "bg-amber-500/80 border-amber-400/40 text-amber-100",
  },
  CANCELED: {
    dot: "bg-red-600",
    pill: "bg-red-500/80 border-red-400/40 text-red-100",
  },
};

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
        href: "/operations/sts-operations/new/form-checklist/quotations/form",
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

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ViewOperationPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { id } = params;

  const { isSidebarOpen, setIsSidebarOpen } = useOperationsSidebar();
  const [activeTab, setActiveTab] = useState("documentation");
  const [expandedModules, setExpandedModules] = useState(new Set());
  const sidebarRef = useRef(null);
  
  const [operationData, setOperationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkedForms, setLinkedForms] = useState([]);
  const [linkedFormsLoading, setLinkedFormsLoading] = useState(false);

  useEffect(() => {
    if (pathname === "/operations/sts-operations/new") {
      setActiveTab("documentation");
    } else if (pathname.startsWith("/operations/sts-operations/new/compatibility")) {
      setActiveTab("compatibility");
    } else if (pathname.startsWith("/operations/sts-operations/new/form-checklist")) {
      setActiveTab("forms");
      setExpandedModules((prev) => new Set([...prev, "forms"]));
    }
  }, [pathname]);

  const fetchLinkedForms = async (opRef) => {
    if (!opRef) return;
    try {
      setLinkedFormsLoading(true);
      const res = await fetch(`/api/operations/sts/linked-forms?operationRef=${encodeURIComponent(opRef)}`);
      const json = await res.json();
      if (json.success) setLinkedForms(json.data || []);
    } catch (err) {
      console.error("Failed to fetch linked forms:", err);
    } finally {
      setLinkedFormsLoading(false);
    }
  };

  useEffect(() => {
    const fetchOperation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/operations/sts/${id}`);
        const data = await response.json();

        if (data.success && data.data) {
          setOperationData(data.data);
          // Fetch linked forms once we have the operation ref
          if (data.data.Operation_Ref_No) {
            fetchLinkedForms(data.data.Operation_Ref_No);
          }
        } else {
          setError("Operation not found");
        }
      } catch (err) {
        console.error("Error fetching operation:", err);
        setError("Failed to load operation");
      } finally {
        setLoading(false);
      }
    };

    fetchOperation();
  }, [id]);

  const calculateBarrels = (mt) => {
    if (!mt || Number.isNaN(Number(mt))) return "—";
    return (Number(mt) * 7.33).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-white/60">Loading operation data...</p>
        </div>
      </div>
    );
  }

  if (error || !operationData) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-300">{error || "Operation not found"}</p>
          <Link
            href="/operations/sts-operations/new/list"
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl text-white font-medium transition"
          >
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  const op = operationData;

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full w-[260px] sm:w-[300px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/20 shadow-2xl backdrop-blur-md z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        
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
          <div className="flex-1 overflow-y-auto p-4">
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
                      </button>
                      {expandedModules.has(tab.key) && (
                        <div className="ml-4 space-y-1 mt-1.5 pl-4 border-l-2 border-orange-500/30">
                          {tab.submodules.map((submodule) => {
                            const isActiveSub = pathname.startsWith(submodule.href.split("/form")[0]);
                            return (
                              <Link
                                key={submodule.key}
                                href={submodule.href}
                                className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                                  isActiveSub
                                    ? "bg-white/20 text-white border-orange-400/50 shadow-md"
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
                      className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
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

      {/* Main Content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
        <div className={`mx-auto py-8 space-y-6 ${isSidebarOpen ? "max-w-7xl px-6" : "px-6"}`}>
          <header className="mt-12 md:mt-0 mb-6 flex items-center gap-4">
            {/* Left: Dashboard */}
            <Link
              href="/dashboard"
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
            >
              ← Dashboard
            </Link>

            {/* Center: Heading */}
            <div className="flex-1 flex flex-col items-center text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-200 font-semibold">
                STS Management System
              </p>
              <h1 className="text-xl sm:text-2xl font-bold">View STS Operation</h1>
              <p className="text-xs text-slate-300 mt-1">
                Operation Ref: {op.Operation_Ref_No || "—"}
              </p>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => router.push(`/operations/sts-operations/new/edit/${id}`)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white text-sm font-medium transition shadow-lg shadow-blue-500/30"
              >
                Edit Operation
              </button>
              <button
                onClick={() => router.push("/operations/sts-operations/new/list")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition hover:scale-110"
                aria-label="Close"
                title="Close"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>
          </header>

          {/* Operation Details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-lg font-semibold text-white">Operation Details</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusTone[op.operationStatus]?.pill ||
                    "bg-white/10 text-white"
                  }`}
                >
                  {op.operationStatus || "—"}
                </span>
              </div>

              {/* Basic Information */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Operation Ref No
                  </label>
                  <p className="text-white font-medium">{op.Operation_Ref_No || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Type of Operation
                  </label>
                  <p className="text-white font-medium">{op.typeOfOperation || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Client
                  </label>
                  <p className="text-white font-medium">{op.client || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Location
                  </label>
                  <p className="text-white font-medium">{op.location?.name || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Mooring Master
                  </label>
                  <p className="text-white font-medium">{op.mooringMaster?.name || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Type of Cargo
                  </label>
                  <p className="text-white font-medium">{op.typeOfCargo?.type || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Operation Type
                  </label>
                  <p className="text-white font-medium">{op.operationType || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Vessel Type (CHS)
                  </label>
                  <p className="text-white font-medium">{op.vesselTypeCHS || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Vessel Type (MS)
                  </label>
                  <p className="text-white font-medium">{op.vesselTypeMS || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Quantity (MT)
                  </label>
                  <p className="text-white font-medium">{op.quantity || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Quantity (Barrels)
                  </label>
                  <p className="text-white font-medium">{calculateBarrels(op.quantity)}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Flow Direction
                  </label>
                  <p className="text-white font-medium capitalize">{op.flowDirection || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Operation Start Time
                  </label>
                  <p className="text-white font-medium">{formatDate(op.operationStartTime)}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Operation End Time
                  </label>
                  <p className="text-white font-medium">{formatDate(op.operationEndTime)}</p>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">
                    Created At
                  </label>
                  <p className="text-white font-medium">{formatDate(op.createdAt)}</p>
                </div>
              </div>

              {/* CHS / MS Section */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">CHS / MS Information</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-xl border border-sky-400/20 bg-sky-500/5 p-4">
                    <h4 className="text-sm font-semibold text-sky-200 mb-3">CHS (Constant Heading Ship)</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-white/60 mb-1">CHS Name</label>
                        <p className="text-white">{op.chs || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Vessel Type</label>
                        <p className="text-white">{op.vesselTypeCHS || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-4">
                    <h4 className="text-sm font-semibold text-orange-200 mb-3">MS (Manoeuvring Ship)</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-white/60 mb-1">MS Name</label>
                        <p className="text-white">{op.ms || "—"}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-white/60 mb-1">Vessel Type</label>
                        <p className="text-white">{op.vesselTypeMS || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipment Section */}
              {op.equipments && op.equipments.length > 0 && (
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Equipment Used</h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {op.equipments.map((eq) => (
                      <div
                        key={eq.equipment?._id || eq.equipment?.id || `${eq.startTime}-${eq.equipment}`}
                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                      >
                        <p className="text-white font-medium">
                          {eq.equipment?.equipmentName || eq.equipment?.name || "Equipment"}
                        </p>
                        {eq.startTime && (
                          <p className="text-xs text-white/60 mt-1">
                            Start: {formatDate(eq.startTime)}
                          </p>
                        )}
                        {eq.endTime && (
                          <p className="text-xs text-white/60">
                            End: {formatDate(eq.endTime)}
                          </p>
                        )}
                        {eq.status && (
                          <p className="text-xs text-white/60 mt-1">
                            Status: {eq.status}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {op.remarks && (
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Remarks</h3>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-white whitespace-pre-wrap">{op.remarks}</p>
                  </div>
                </div>
              )}

              {/* ═══════════ Linked Checklist / Form Status ═══════════ */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Linked Forms Status</h3>

                {linkedFormsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400" />
                    Loading linked forms…
                  </div>
                ) : linkedForms.length > 0 ? (
                  <>
                    {/* Checklists */}
                    {linkedForms.filter((f) => f.category === "checklist").length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-white/80 mb-3">Checklists</h4>
                        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                          {linkedForms.filter((f) => f.category === "checklist").map((f) => (
                            <div
                              key={f.formCode}
                              className={`rounded-xl border p-4 transition-all ${
                                f.filled
                                  ? "border-emerald-500/30 bg-emerald-900/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-orange-300 truncate">{f.formCode}</p>
                                  <p className="text-sm font-semibold text-white truncate">{f.label}</p>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  f.filled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                                }`}>
                                  {f.filled ? `Filled (${f.count})` : "Pending"}
                                </span>
                              </div>
                              {f.filled && f.docs?.[0] && (
                                <div className="mt-2 space-y-0.5 text-[11px] text-white/60">
                                  <p>Seq: <span className="text-sky-300 font-mono">{f.docs[0].sequenceNumber || "—"}</span></p>
                                  <p>Status: <span className={
                                    f.docs[0].status === "SUBMITTED" || f.docs[0].status === "APPROVED"
                                      ? "text-emerald-300" : "text-amber-300"
                                  }>{f.docs[0].status}</span></p>
                                  <p>Date: {f.docs[0].createdAt
                                    ? new Date(f.docs[0].createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                    : "—"}</p>
                                  {/* Show download link if PDF exists */}
                                  {(() => {
                                    const pdfDoc = (op.documents || []).find(d => d.documentType === f.formCode && d.filePath);
                                    return pdfDoc ? (
                                      <a
                                        href={pdfDoc.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-1.5 text-orange-400 hover:text-orange-300 text-[11px] underline"
                                      >
                                        📄 View PDF
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Equipment */}
                    {linkedForms.filter((f) => f.category === "equipment").length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-white/80 mb-3">STS Equipment</h4>
                        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                          {linkedForms.filter((f) => f.category === "equipment").map((f) => (
                            <div
                              key={f.formCode}
                              className={`rounded-xl border p-4 transition-all ${
                                f.filled
                                  ? "border-emerald-500/30 bg-emerald-900/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-orange-300 truncate">{f.formCode}</p>
                                  <p className="text-sm font-semibold text-white truncate">{f.label}</p>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  f.filled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                                }`}>
                                  {f.filled ? `Filled (${f.count})` : "Pending"}
                                </span>
                              </div>
                              {f.filled && f.docs?.[0] && (
                                <div className="mt-2 space-y-0.5 text-[11px] text-white/60">
                                  <p>Seq: <span className="text-sky-300 font-mono">{f.docs[0].sequenceNumber || "—"}</span></p>
                                  <p>Status: <span className={
                                    f.docs[0].status === "SUBMITTED" || f.docs[0].status === "APPROVED"
                                      ? "text-emerald-300" : "text-amber-300"
                                  }>{f.docs[0].status}</span></p>
                                  {/* Show download link if PDF exists */}
                                  {(() => {
                                    const pdfDoc = (op.documents || []).find(d => d.documentType === f.formCode && d.filePath);
                                    return pdfDoc ? (
                                      <a
                                        href={pdfDoc.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-1.5 text-orange-400 hover:text-orange-300 text-[11px] underline"
                                      >
                                        📄 View PDF
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback & Logs */}
                    {linkedForms.filter((f) => f.category === "feedback").length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-white/80 mb-3">Feedback & Logs</h4>
                        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                          {linkedForms.filter((f) => f.category === "feedback").map((f) => (
                            <div
                              key={f.formCode}
                              className={`rounded-xl border p-4 transition-all ${
                                f.filled
                                  ? "border-emerald-500/30 bg-emerald-900/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-orange-300 truncate">{f.formCode}</p>
                                  <p className="text-sm font-semibold text-white truncate">{f.label}</p>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  f.filled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400"
                                }`}>
                                  {f.filled ? `Filled (${f.count})` : "Pending"}
                                </span>
                              </div>
                              {f.filled && f.docs?.[0] && (
                                <div className="mt-2 space-y-0.5 text-[11px] text-white/60">
                                  <p>Seq: <span className="text-sky-300 font-mono">{f.docs[0].sequenceNumber || "—"}</span></p>
                                  <p>Status: <span className={
                                    f.docs[0].status === "SUBMITTED" || f.docs[0].status === "APPROVED"
                                      ? "text-emerald-300" : "text-amber-300"
                                  }>{f.docs[0].status}</span></p>
                                  {/* Show download link if PDF exists */}
                                  {(() => {
                                    const pdfDoc = (op.documents || []).find(d => d.documentType === f.formCode && d.filePath);
                                    return pdfDoc ? (
                                      <a
                                        href={pdfDoc.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-1.5 text-orange-400 hover:text-orange-300 text-[11px] underline"
                                      >
                                        📄 View PDF
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-white/50 py-4">No linked form data available.</p>
                )}
              </div>

              {/* File Attachments Section */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Attached Documents</h3>

                {(() => {
                  // Get list of form codes that are already shown in "Linked Forms Status"
                  const linkedFormCodes = new Set(linkedForms.map(f => f.formCode));
                  
                  // Filter out system docs that are already shown in Linked Forms Status
                  const systemDocs = (op.documents || []).filter(doc => {
                    // Only show documents that are NOT linked forms (e.g., manual uploads, other docs)
                    return !linkedFormCodes.has(doc.documentType);
                  });
                  
                  const legacyDocs = [
                    { label: "Joint Plan Operation", path: op.jpo },
                    { label: "Mooring Plan", path: op.mooringPlan },
                    { label: "Risk Assessment", path: op.riskAssessment },
                    { label: "Standing Order", path: op.standingOrder },
                    { label: "Checklist 1", path: op.checklist1 },
                    { label: "CHS SSQ", path: op.chsSSQ },
                    { label: "MS SSQ", path: op.msSSQ },
                    { label: "CHS Q88", path: op.chsQ88 },
                    { label: "MS Q88", path: op.msQ88 },
                    { label: "CHS Mooring Arrangement", path: op.chsMooringArrangement },
                    { label: "MS Mooring Arrangement", path: op.msMooringArrangement },
                    { label: "CHS GA Plan", path: op.chsGAPlan },
                    { label: "MS GA Plan", path: op.msGAPlan },
                    { label: "CHS MSDS", path: op.chsMSDS },
                    { label: "MS MSDS", path: op.msMSDS },
                    { label: "CHS Indemnity", path: op.chsIndemnity },
                    { label: "MS Indemnity", path: op.msIndemnity },
                  ].filter((doc) => doc.path);

                  const hasDocuments = systemDocs.length > 0 || legacyDocs.length > 0;

                  if (!hasDocuments) {
                    return (
                      <div className="text-center py-8 text-white/60">
                        <p>No documents attached to this operation.</p>
                      </div>
                    );
                  }

                  const statusColors = {
                    GENERATED: "bg-green-500/20 text-green-300",
                    GENERATING: "bg-yellow-500/20 text-yellow-300",
                    FAILED: "bg-red-500/20 text-red-300",
                    PENDING: "bg-gray-500/20 text-gray-300",
                  };

                  return (
                    <>
                      {systemDocs.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-white/80 mb-3">
                            System Generated Documents
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {systemDocs.map((doc) => (
                              <div
                                key={`${doc.documentType}-${doc.filePath || doc.checklistId || Date.now()}`}
                                className="rounded-lg border border-white/10 bg-white/5 p-3"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-orange-300 mb-0.5">
                                      {doc.documentType || "—"}
                                    </p>
                                    <p className="text-sm font-medium text-white">
                                      {FORM_NAME_MAP[doc.documentType] || doc.documentType || "—"}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      statusColors[doc.status] || statusColors.PENDING
                                    }`}
                                  >
                                    {doc.status || "—"}
                                  </span>
                                </div>
                                {doc.filePath && (
                                  <a
                                    href={doc.filePath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-orange-400 hover:text-orange-300 underline block mt-2"
                                  >
                                    View Document
                                  </a>
                                )}
                                {doc.uploadedAt && (
                                  <p className="text-xs text-white/50 mt-2">
                                    Uploaded: {formatDate(doc.uploadedAt)}
                                  </p>
                                )}
                                {doc.source && (
                                  <p className="text-xs text-white/50">Source: {doc.source}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {legacyDocs.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white/80 mb-3">
                            Uploaded Documents
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {legacyDocs.map((doc) => (
                              <div
                                key={doc.path}
                                className="rounded-lg border border-white/10 bg-white/5 p-3"
                              >
                                <p className="text-xs text-white/60 mb-1">{doc.label}</p>
                                <a
                                  href={doc.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 underline"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                  Download
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                <Link
                  href="/operations/sts-operations/new/list"
                  className="px-6 py-3 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
                >
                  Back to List
                </Link>
                <button
                  onClick={() => router.push(`/operations/sts-operations/new/edit/${id}`)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition"
                >
                  Edit Operation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
