"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";

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
        <div className={`mx-auto py-8 space-y-6 ${isSidebarOpen ? "max-w-7xl px-6" : "px-6"}`}>
          <header className="mb-6 flex items-center gap-4">
            {/* Left: Dashboard Button */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition duration-200 hover:translate-y-[1px] flex-shrink-0"
            >
              ← Dashboard
            </Link>
            
            {/* Center: Heading */}
            <div className="flex-1 flex flex-col items-center text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-200 font-semibold">
                STS Management System
              </p>
              <h1 className="text-2xl font-bold">View STS Operation</h1>
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

              {/* File Attachments Section */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Attached Documents</h3>

                {(() => {
                  const systemDocs = op.documents || [];
                  const legacyDocs = [
                    { label: "Joint Plan Operation", path: op.jpo },
                    { label: "Standing Order", path: op.standingOrder },
                    { label: "Checklist 1", path: op.checklist1 },
                    { label: "CHS SSQ", path: op.chsSSQ },
                    { label: "MS SSQ", path: op.msSSQ },
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
                                    <p className="text-xs text-white/60 mb-1">Document Type</p>
                                    <p className="text-sm font-medium text-white">
                                      {doc.documentType || "—"}
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
                            Legacy Documents
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
                                  className="text-sm text-orange-400 hover:text-orange-300 underline"
                                >
                                  View Document
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
