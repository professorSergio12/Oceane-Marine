"use client";

import Link from "next/link";
import { useState, useEffect, useRef, forwardRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOperationsSidebar } from "../../OperationsSidebarContext";
import { getExportColumns, buildExportHeaders, buildExportRow } from "./sts-export-columns";
import {
  ActionViewIcon,
  ActionEditIcon,
  ActionDeleteIcon,
  ActionDownloadIcon,
} from "@/app/components/RecordActionIcons";
import { resolveLinkedFormFilePath } from "@/lib/utils/sts-linked-form-file";

const statusTone = {
  INPROGRESS: {
    dot: "bg-sky-600",
    pill: "bg-sky-500/80 border-sky-400/40 text-sky-100",
    option: "text-sky-100",
  },
  COMPLETED: {
    dot: "bg-emerald-600",
    pill: "bg-emerald-500/80 border-emerald-400/40 text-emerald-100",
    option: "text-emerald-100",
  },
  "Lined Up": {
    dot: "bg-amber-600",
    pill: "bg-amber-500/80 border-amber-400/40 text-amber-100",
    option: "text-amber-100",
  },
  CANCELED: {
    dot: "bg-red-600",
    pill: "bg-red-500/80 border-red-400/40 text-red-100",
    option: "text-red-100",
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

export default function NewOperationPage() {
  const [status, setStatus] = useState("INPROGRESS");
  const [showStatusList, setShowStatusList] = useState(false);
  const { isSidebarOpen, setIsSidebarOpen } = useOperationsSidebar();
  const [activeTab, setActiveTab] = useState("documentation");
  const [expandedModules, setExpandedModules] = useState(new Set());
  const statusRef = useRef(null);
  const sidebarRef = useRef(null);
  const pathname = usePathname();
  const [cargoTypes, setCargoTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [mooringMasters, setMooringMasters] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [flowDir, setFlowDir] = useState("left");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [createdOperationId, setCreatedOperationId] = useState(null);
  const searchParams = useSearchParams();
  const [activeViewTab, setActiveViewTab] = useState(() => {
    return searchParams.get("tab") === "list" ? "list" : "create";
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "list") setActiveViewTab("list");
  }, [searchParams]);

  const cycleFlowDir = () =>
    setFlowDir((d) => {
      if (d === "left") return "right";
      if (d === "right") return "both";
      return "left";
    });

  // Calculate barrels from metric tons (approximate conversion: 1 MT ≈ 7.33 barrels)
  const [quantityMT, setQuantityMT] = useState("");
  const [quantityBarrels, setQuantityBarrels] = useState("");
  const [operationRef, setOperationRef] = useState("");
  const [generatingRef, setGeneratingRef] = useState(false);
  const [preStsDocs, setPreStsDocs] = useState({ jpo: "", riskAssessment: "" });
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [nearMissReports, setNearMissReports] = useState([]);

  /* Auto-fetch Pre-STS docs (JPO, Risk Assessment, Near Miss) when location changes */
  const handleLocationChange = async (locationId) => {
    if (!locationId || locationId === "Select") {
      setPreStsDocs({ jpo: "", riskAssessment: "" });
      setRiskAssessments([]);
      setNearMissReports([]);
      return;
    }
    // Find the location name for Risk Assessment lookup
    const loc = locations.find((l) => String(l._id) === String(locationId));
    const locName = loc?.name || "";
    try {
      const params = new URLSearchParams();
      params.set("locationId", locationId);
      if (locName) params.set("locationName", locName);
      const res = await fetch(`/api/operations/sts/pre-sts-docs?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPreStsDocs({
          jpo: json.data.jpo || "",
          riskAssessment: json.data.riskAssessment || "",
        });
        setRiskAssessments(json.data.riskAssessments || []);
        setNearMissReports(json.data.nearMissReports || []);
      }
    } catch (err) {
      console.error("Failed to fetch pre-STS docs:", err);
    }
  };

  useEffect(() => {
    if (quantityMT && !isNaN(parseFloat(quantityMT)) && parseFloat(quantityMT) > 0) {
      const barrels = (parseFloat(quantityMT) * 7.33).toFixed(2);
      setQuantityBarrels(barrels);
    } else {
      setQuantityBarrels("");
    }
  }, [quantityMT]);

  const [linkedForms, setLinkedForms] = useState([]);
  const [linkedOperationDocuments, setLinkedOperationDocuments] = useState([]);
  const [linkedFormsLoading, setLinkedFormsLoading] = useState(false);

  // Fetch linked form statuses whenever the operation ref changes
  const fetchLinkedForms = async (opRef) => {
    if (!opRef) {
      setLinkedForms([]);
      setLinkedOperationDocuments([]);
      return;
    }
    try {
      setLinkedFormsLoading(true);
      const res = await fetch(`/api/operations/sts/linked-forms?operationRef=${encodeURIComponent(opRef)}`);
      const json = await res.json();
      if (json.success) {
        setLinkedForms(json.data || []);
        setLinkedOperationDocuments(json.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch linked forms:", err);
    } finally {
      setLinkedFormsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedForms(operationRef);
  }, [operationRef]);

  useEffect(() => {
    setQuantityMT("");
    setQuantityBarrels("");
    setOperationRef("");
  }, [formResetKey]);

  const handleGenerateOperationRef = async () => {
    try {
      setGeneratingRef(true);
      const response = await fetch("/api/operations/sts/generate-ref");
      const data = await response.json();

      if (data.success && data.operationRef) {
        setOperationRef(data.operationRef);
        // Update the input field
        if (formRef.current) {
          const refInput = formRef.current.querySelector('input[name="Operation_Ref_No"]');
          if (refInput) {
            refInput.value = data.operationRef;
          }
        }
      } else {
        throw new Error(data.error || "Failed to generate operation ref");
      }
    } catch (error) {
      console.error("Error generating operation ref:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingRef(false);
    }
  };

  const statuses = [
    { key: "INPROGRESS", label: "In progress" },
    { key: "COMPLETED", label: "Completed" },
    { key: "Lined Up", label: "Lined Up" },
    { key: "CANCELED", label: "Canceled" },
  ];

  useEffect(() => {
    const handler = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setShowStatusList(false);
      }
    };
    if (showStatusList) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showStatusList]);

  // Removed click-outside-to-close behavior - sidebar only closes on "x" button click (like QHSE module)

  // Set active tab based on pathname
  useEffect(() => {
    if (pathname === "/operations/sts-operations/new") {
      setActiveTab("documentation");
    } else if (pathname.startsWith("/operations/sts-operations/new/compatibility")) {
      setActiveTab("compatibility");
      // Don't auto-expand forms when on compatibility page
    } else if (pathname.startsWith("/operations/sts-operations/new/form-checklist")) {
      setActiveTab("forms");
      // Auto-expand forms module only when on form-checklist pages
      setExpandedModules((prev) => new Set([...prev, "forms"]));
    } else if (pathname.startsWith("/operations/sts-operations/new/locations")) {
      setActiveTab("locations");
    } else if (pathname.startsWith("/operations/sts-operations/new/cargos")) {
      setActiveTab("cargos");
    } else if (pathname.startsWith("/operations/sts-operations/new/mooringmaster")) {
      setActiveTab("mooring");
    }
  }, [pathname]);

  // Fetch master data for dynamic dropdowns
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        setLoadingMasters(true);
        const [cargoRes, locationRes, mooringRes, equipmentRes] =
          await Promise.all([
            fetch("/api/master/cargo-type/list"),
            fetch("/api/master/locations/list"),
            fetch("/api/master/mooring-master/list"),
            fetch("/api/pms/equipment-inventory/primary-equipment/list"),
          ]);

        const cargoJson = await cargoRes.json();
        const locationJson = await locationRes.json();
        const mooringJson = await mooringRes.json();
        const equipmentJson = await equipmentRes.json();

        setCargoTypes(cargoJson?.cargoTypes || []);
        setLocations(locationJson?.locations || []);
        setMooringMasters(mooringJson?.mooringMasters || []);
        setEquipmentList(equipmentJson?.equipments || []);
      } catch (error) {
        console.error("Failed to load masters", error);
      } finally {
        setLoadingMasters(false);
      }
    };

    fetchMasters();
  }, []);

  const handleSubmit = async (e, isSubmit = false) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData(formRef.current);

      // Add status - always INPROGRESS for draft, keep selected status for submit
      const finalStatus = isSubmit ? status : "INPROGRESS";
      formData.append("status", finalStatus);
      formData.append("operationStatus", finalStatus);
      
      // Mark as submitted if submit button clicked
      if (isSubmit) {
        formData.append("isSubmitted", "true");
        formData.append("submittedAt", new Date().toISOString());
      }
      
      // Add flow direction
      formData.append("flowDirection", flowDir);

      // Add quantity from state if available
      if (quantityMT) {
        formData.set("quantity", quantityMT);
      }

      // IDs are now in option values; drop placeholders
      const mooringMasterId = formData.get("mooringMaster");
      if (!mooringMasterId || mooringMasterId === "Select") {
        formData.delete("mooringMaster");
      }

      const locationId = formData.get("location");
      if (!locationId || locationId === "Select") {
        formData.delete("location");
      }

      const cargoId = formData.get("typeOfCargo");
      if (!cargoId || cargoId === "Select") {
        formData.delete("typeOfCargo");
      }

      // Filter out empty vessel type fields
      const vesselTypeCHS = formData.get("vesselTypeCHS");
      if (!vesselTypeCHS || vesselTypeCHS === "Select" || vesselTypeCHS === "") {
        formData.delete("vesselTypeCHS");
      }

      const vesselTypeMS = formData.get("vesselTypeMS");
      if (!vesselTypeMS || vesselTypeMS === "Select" || vesselTypeMS === "") {
        formData.delete("vesselTypeMS");
      }

      // Equipments multi-select
      const selectedEquipments = formData.getAll("equipments").filter(Boolean);
      formData.delete("equipments");
      selectedEquipments.forEach((id) => formData.append("equipments", id));

      const response = await fetch("/api/operations/sts/create", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create operation");
      }

      // Show success page instead of alert
      setCreatedOperationId(data.data?._id || data.data?.id);
      setShowSuccessPage(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Success page component
  if (showSuccessPage) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center space-y-6 px-6">
          {/* Big Green Tick */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 animate-scale-in">
                <svg
                  className="w-20 h-20 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              {/* Animated rings */}
              <div className="absolute inset-0 w-32 h-32 border-4 border-green-500/30 rounded-full animate-ping"></div>
              <div className="absolute inset-0 w-32 h-32 border-4 border-green-500/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* Success Message */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">New Operation Created</h2>
            <p className="text-lg text-white/80">Your STS operation has been successfully created!</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setShowSuccessPage(false);
                formRef.current?.reset();
                setStatus("INPROGRESS");
                setFlowDir("left");
                setFormResetKey((k) => k + 1);
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition"
            >
              Create Another
            </button>
            <Link
              href="/operations/sts-operations/new?tab=list"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl text-white font-medium transition shadow-lg shadow-orange-500/30"
            >
              View All Operations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-transparent text-white flex"
    >
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
                            const isActiveSub =
                              pathname.startsWith(submodule.href.split("/form")[0]) ||
                              pathname.startsWith(submodule.href.split("/list")[0]);
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

      {/* Main Content - fixed left margin so content stays in place when sidebar collapses */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
         <div className={`mx-auto py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 ${isSidebarOpen ? "max-w-7xl px-3 sm:px-4 md:px-6" : "px-3 sm:px-4 md:px-6"}`}>
           <header className="mt-12 md:mt-0 mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Left: Dashboard */}
            <Link
              href="/dashboard"
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
            >
              ← Dashboard
            </Link>

            {/* Center: Heading */}
            <div className="flex-1 flex flex-col items-center text-center w-full sm:w-auto">
              <p className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.25em] text-slate-200 font-semibold">
                STS Management System
              </p>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">STS Operation Documentation</h1>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 self-end sm:self-auto">
              <div className="inline-flex rounded-lg sm:rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <button
                  onClick={() => setActiveViewTab("create")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                    activeViewTab === "create"
                      ? "bg-orange-500 text-white"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={() => setActiveViewTab("list")}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition ${
                    activeViewTab === "list"
                      ? "bg-orange-500 text-white"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  List
                </button>
              </div>
            
            </div>
          </header>

          {/* Tab Content */}
          {activeViewTab === "create" && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto"
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-white/10 pb-3 sm:pb-4">
              <StatusDropdown
                status={status}
                onSelect={(val) => {
                  setStatus(val);
                  setShowStatusList(false);
                }}
                show={showStatusList}
                setShow={setShowStatusList}
                statuses={statuses}
                ref={statusRef}
              />
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-200">
                <span className="text-base sm:text-lg">⏱️</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span>Start</span>
                  <input
                    type="datetime-local"
                    name="operationStartTime"
                    required
                    className="w-36 sm:w-48 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span>End</span>
                  <input
                    type="datetime-local"
                    name="operationEndTime"
                    className="w-36 sm:w-48 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                </div>
              </div>
            </div>

            {/* Top-line details */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">
                  Operation Ref No
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                name="Operation_Ref_No"
                    value={operationRef}
                    onChange={(e) => setOperationRef(e.target.value)}
                    placeholder="Click generate or enter manually"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateOperationRef}
                    disabled={generatingRef}
                    className="px-3 py-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-300 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    title="Generate Operation Ref Number"
                  >
                    {generatingRef ? (
                      <span className="inline-block w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "⚡"
                    )}
                  </button>
                </div>
              </div>
              <SelectField
                  label="Type of operation"
                  name="typeOfOperation"
                  placeholder="Select type of operation"
                  options={["Ship to Ship", "POAC", "Fender Hire", "Hose hire"]}
                />
              <TextField
                label="Client"
                placeholder="Enter client name"
                name="client"
              />
              <SelectField
                label="Mooring Master"
                loading={loadingMasters}
                options={[
                  { label: "Select", value: "" },
                  ...mooringMasters
                    .filter((m) => m.availabilityStatus === "AVAILABLE")
                    .map((m) => ({ label: m.name, value: m._id })),
                ]}
                name="mooringMaster"
              />
              <SelectField
                label="Location"
                loading={loadingMasters}
                options={[
                  { label: "Select", value: "" },
                  ...locations.map((l) => ({ label: l.name, value: l._id })),
                ]}
                name="location"
                onChange={handleLocationChange}
              />
              <SelectField
                label="Type of cargo"
                loading={loadingMasters}
                options={[
                  { label: "Select", value: "" },
                  ...cargoTypes.map((c) => ({ label: c.type, value: c._id })),
                ]}
                name="typeOfCargo"
              />
              <SelectField
                label="Operation Type"
                name="operationType"
                placeholder="Select operation type"
                options={[
                  { label: "Select", value: "" },
                  { label: "underway", value: "underway" },
                  { label: "At Anchor", value: "At Anchor" },
                ]}
              />
              <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">
                  Quantity (MT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantityMT}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty, numbers, and one decimal point
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setQuantityMT(value);
                    }
                  }}
                  onWheel={(e) => e.target.blur()}
                  placeholder="Enter quantity in metric tons"
                  name="quantity"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">
                  Quantity (Barrels)
                </label>
                <input
                  type="text"
                  readOnly
                  value={quantityBarrels || ""}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 cursor-not-allowed"
                  placeholder="Auto-calculated from MT"
                />
                <p className="text-xs text-white/50 mt-1">
                  Conversion: 1 MT ≈ 7.33 barrels (varies by cargo density)
                </p>
                </div>
              </div>
            </div>

            {/* CHS / MS block */}
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between gap-4 ">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-200 font-bold" title="Mother Ship">
                    CHS
                  </div>
                  
                </div>
                <button
                  type="button"
                  onClick={cycleFlowDir}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 transition"
                  aria-label="Toggle direction"
                  title="Toggle flow direction"
                >
                  <ArrowIcon direction={flowDir} />
                </button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/15 border border-orange-400/30 flex items-center justify-center text-orange-200 font-bold" title="Daughter Ship">
                    MS
                  </div>
                  
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 space-y-3">
                  <TextField
                    label="CHS"
                    name="chs"
                    placeholder="Enter CHS name"
                  />
                  <SelectField
                    label="Type of Vessel (CHS)"
                    options={[
                      { label: "Select", value: "" },
                      { label: "VLCC", value: "VLCC" },
                      { label: "ULCC", value: "ULCC" },
                      { label: "Suexmax", value: "Suexmax" },
                      { label: "Aframax", value: "Aframax" },
                      { label: "panamax", value: "panamax" },
                      { label: "post-panamax", value: "post-panamax" },
                      { label: "Handysize", value: "Handysize" },
                      { label: "Capezie", value: "Capezie" },
                      { label: "Supramax", value: "Supramax" },
                    ]}
                    name="vesselTypeCHS"
                  />
                  <TextField
                    label="LOA (CHS)"
                    name="loaCHS"
                    placeholder="Enter LOA for CHS"
                  />
                  <UploadPill
                    label="SSQ"
                    description="Ship Standard Questionnaire"
                    name="chsSSQ"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Q88"
                    description="Q88 Vessel Data"
                    name="chsQ88"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Mooring Arr."
                    description="Mooring Arrangement"
                    name="chsMooringArrangement"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="GA Plan"
                    description="General Arrangement Plan"
                    name="chsGAPlan"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="MSDS"
                    description="Material Safety Data Sheet"
                    name="chsMSDS"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Indemnity"
                    description="Indemnity Document"
                    name="chsIndemnity"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                </div>

                <div className="rounded-2xl border border-orange-400/20 bg-orange-500/5 p-4 space-y-3">
                  <TextField
                    label="MS"
                    name="ms"
                    placeholder="Enter MS name"
                  />
                  <SelectField
                    label="Type of Vessel (MS)"
                    options={[
                      { label: "Select", value: "" },
                      { label: "VLCC", value: "VLCC" },
                      { label: "ULCC", value: "ULCC" },
                      { label: "Suexmax", value: "Suexmax" },
                      { label: "Aframax", value: "Aframax" },
                      { label: "panamax", value: "panamax" },
                      { label: "post-panamax", value: "post-panamax" },
                      { label: "Handysize", value: "Handysize" },
                      { label: "Capezie", value: "Capezie" },
                      { label: "Supramax", value: "Supramax" },
                    ]}
                    name="vesselTypeMS"
                  />
                  <TextField
                    label="LOA (MS)"
                    name="loaMS"
                    placeholder="Enter LOA for MS"
                  />
                  <UploadPill
                    label="SSQ"
                    description="Ship Standard Questionnaire"
                    name="msSSQ"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Q88"
                    description="Q88 Vessel Data"
                    name="msQ88"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Mooring Arr."
                    description="Mooring Arrangement"
                    name="msMooringArrangement"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="GA Plan"
                    description="General Arrangement Plan"
                    name="msGAPlan"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="MSDS"
                    description="Material Safety Data Sheet"
                    name="msMSDS"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Indemnity"
                    description="Indemnity Document"
                    name="msIndemnity"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                </div>
              </div>
            </div>

            {/* Pre-STS documents */}
            <SectionTitle title="Pre-STS Documents" />
            <div className="grid gap-4 md:grid-cols-3">
              <ActionUpload
                label="Joint Plan Operation"
                name="jpo"
                resetKey={formResetKey}
                externalValue={preStsDocs.jpo}
                onClear={() => setPreStsDocs((prev) => ({ ...prev, jpo: "" }))}
              />
              <ActionUpload
                label="Risk Assessment"
                name="riskAssessment"
                resetKey={formResetKey}
                externalValue={preStsDocs.riskAssessment}
                onClear={() => setPreStsDocs((prev) => ({ ...prev, riskAssessment: "" }))}
              />
              <UploadPill
                label="Mooring Plan"
                description="Upload mooring plan document"
                name="mooringPlan"
                accent="sky"
                resetKey={formResetKey}
              />
            </div>

            {/* QHSE – Risk Assessments for this location */}
            {riskAssessments.length > 0 && (
              <>
                <SectionTitle title={`Risk Assessments — QHSE (${riskAssessments.length})`} />
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/10 p-4 space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                          <th className="py-2 pr-4">Form Code</th>
                          <th className="py-2 pr-4">Serial #</th>
                          <th className="py-2 pr-4">Location</th>
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Version</th>
                          <th className="py-2 pr-4">File</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskAssessments.map((ra) => (
                          <tr key={ra._id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="py-2 pr-4 font-mono text-emerald-300">{ra.formCode || "—"}</td>
                            <td className="py-2 pr-4 text-white/80">{ra.serialNumber || "—"}</td>
                            <td className="py-2 pr-4 text-white/80">{ra.locationName || "—"}</td>
                            <td className="py-2 pr-4 text-white/70">
                              {ra.assessmentDate
                                ? new Date(ra.assessmentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                : "—"}
                            </td>
                            <td className="py-2 pr-4 text-white/70">{ra.version || "—"}</td>
                            <td className="py-2 pr-4">
                              {ra.filePath ? (
                                <a
                                  href={ra.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open or download"
                                  aria-label="Open or download file"
                                  className="inline-flex items-center justify-center rounded-lg border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/15 p-1.5 transition"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </a>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* QHSE – Near Miss Reports for this location */}
            {nearMissReports.length > 0 && (
              <>
                <SectionTitle title={`Near Miss / Incident Reports — QHSE (${nearMissReports.length})`} />
                <div className="rounded-2xl border border-red-500/30 bg-red-900/10 p-4 space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                          <th className="py-2 pr-4">Form Code</th>
                          <th className="py-2 pr-4">Job Ref #</th>
                          <th className="py-2 pr-4">Vessel</th>
                          <th className="py-2 pr-4">Date / Time</th>
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2 pr-4">Area</th>
                          <th className="py-2 pr-4">Observer</th>
                          <th className="py-2 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nearMissReports.map((nm) => (
                          <tr key={nm._id} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="py-2 pr-4 font-mono text-red-300">{nm.formCode || "—"}</td>
                            <td className="py-2 pr-4 text-sky-300 font-semibold">{nm.JobRefNo || "—"}</td>
                            <td className="py-2 pr-4 text-white/80">{nm.VesselName || "—"}</td>
                            <td className="py-2 pr-4 text-white/70">
                              {nm.timeOfIncident
                                ? new Date(nm.timeOfIncident).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                nm.TypeOfReporting === "Near Miss" ? "bg-yellow-500/20 text-yellow-300" :
                                nm.TypeOfReporting === "Best Practice" ? "bg-emerald-500/20 text-emerald-300" :
                                "bg-red-500/20 text-red-300"
                              }`}>
                                {nm.TypeOfReporting || "—"}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-white/70 text-xs">{nm.AreaOfNearMiss || "—"}</td>
                            <td className="py-2 pr-4 text-white/70 text-xs">{nm.NameOfObserver || "—"}</td>
                            <td className="py-2 pr-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                nm.status === "Reviewed" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                              }`}>
                                {nm.status || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════
                LINKED FORMS — auto-populated from DB
            ═══════════════════════════════════════════ */}

            {/* Checklists */}
            <SectionTitle title="Checklists" />
            {linkedFormsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400" />
                Loading linked forms…
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {linkedForms.filter((f) => f.category === "checklist").map((f) => (
                  <LinkedFormCard key={f.formCode} form={f} operationDocuments={linkedOperationDocuments} />
                ))}
              </div>
            )}

            {/* STS Equipment */}
            <SectionTitle title="STS Equipment" />
            {linkedFormsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400" />
                Loading…
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {linkedForms.filter((f) => f.category === "equipment").map((f) => (
                  <LinkedFormCard key={f.formCode} form={f} operationDocuments={linkedOperationDocuments} />
                ))}
              </div>
            )}

            {/* Feedback & Logs */}
            <SectionTitle title="Feedback & Logs" />
            {linkedFormsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400" />
                Loading…
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {linkedForms.filter((f) => f.category === "feedback").map((f) => (
                  <LinkedFormCard key={f.formCode} form={f} operationDocuments={linkedOperationDocuments} />
                ))}
                {/* Incident Reporting — no linked form, manual entry */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-300">Incident Reporting</span>
                  </div>
                  <input
                    type="text"
                    name="incidentReporting"
                    placeholder="Enter file URL/path"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                </div>
              </div>
            )}

            {/* No-operation-ref notice */}
            {!operationRef && !linkedFormsLoading && linkedForms.length === 0 && (
              <p className="text-sm text-slate-500 italic">
                Generate an Operation Ref to see linked form statuses.
              </p>
            )}

            {/* Equipment / Remarks */}
            <SectionTitle title="Equipment & Remarks" />
            <div className="grid gap-6 md:grid-cols-2">
              <MultiSelectDropdown
                label="Equipment Used (available only)"
                loading={loadingMasters}
                name="equipments"
                options={equipmentList
                  .filter(
                    (e) => (e.availabilityStatus || "AVAILABLE") === "AVAILABLE"
                  )
                  .map((e) => ({ label: e.equipmentName, value: e._id }))}
                resetKey={formResetKey}
              />
              <TextAreaField
                label="Remarks"
                placeholder="Add remarks..."
                name="remarks"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  formRef.current?.reset();
                  setStatus("INPROGRESS");
                  setFlowDir("left");
                  setOperationRef("");
                  setFormResetKey((k) => k + 1);
                }}
                className="px-6 py-3 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={submitting}
                className="px-6 py-3 rounded-xl border border-blue-400/30 bg-blue-500/20 text-blue-300 font-semibold hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
          )}

          {activeViewTab === "list" && <OperationsListComponent />}
        </div>
      </div>
    </div>
  );
}

// List Component with Filters
function OperationsListComponent() {
  const [operations, setOperations] = useState([]);
  const [allOperations, setAllOperations] = useState([]); // Store all operations for year calculation
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOperations, setFilteredOperations] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const router = useRouter();

  // Fetch all operations once on mount to calculate available years
  useEffect(() => {
    const fetchAllOperations = async () => {
      try {
        const response = await fetch(`/api/operations/sts/list`);
        const data = await response.json();
        if (data.success) {
          setAllOperations(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching all operations:", error);
      }
    };
    fetchAllOperations();
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [statusFilter, yearFilter]);

  useEffect(() => {
    let filtered = operations;

    // Only apply search query client-side (status and year are handled by API)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((op) => {
        const opRef = op.Operation_Ref_No?.toLowerCase() || "";
        const type = op.typeOfOperation?.toLowerCase() || "";
        const location = op.location?.name?.toLowerCase() || "";
        const client = op.client?.toLowerCase() || "";
        const chs = op.chs?.toLowerCase() || "";
        const ms = op.ms?.toLowerCase() || "";
        return (
          opRef.includes(query) ||
          type.includes(query) ||
          location.includes(query) ||
          client.includes(query) ||
          chs.includes(query) ||
          ms.includes(query)
        );
      });
    }

    setFilteredOperations(filtered);
  }, [searchQuery, operations]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (yearFilter) params.append("year", yearFilter);
      
      const response = await fetch(`/api/operations/sts/list?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setOperations(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this operation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/operations/sts/${id}/delete`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchOperations();
      } else {
        alert(data.error || "Failed to delete operation");
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      alert("Failed to delete operation");
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateBarrels = (mt) => {
    if (!mt || isNaN(mt)) return "—";
    return (mt * 7.33).toFixed(2);
  };

  const downloadExcel = () => {
    const columns = getExportColumns();
    const headers = buildExportHeaders(columns);
    const escapeCsv = (val) => {
      const s = val == null ? "" : String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = filteredOperations.map((op) => buildExportRow(op, columns));
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `STS-Operations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique years from all operations (not filtered ones)
  const availableYears = Array.from(
    new Set(
      allOperations
        .map((op) => {
          if (!op.operationStartTime) return null;
          return new Date(op.operationStartTime).getFullYear();
        })
        .filter((year) => year !== null)
    )
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* Search Bar + Download */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Search by Ref No, Type, Location, Client, CHS, MS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-10 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-white/70 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
          >
            <option value="">All</option>
            <option value="INPROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="Lined Up">Lined Up</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-white/70 whitespace-nowrap">Year:</label>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
          >
            <option value="">All</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <ActionDownloadIcon
          onClick={downloadExcel}
          disabled={filteredOperations.length === 0}
          title="Download Excel"
          className="!rounded-xl !p-2.5"
        />
      </div>

      {/* Operations Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-white/60">Loading operations...</p>
        </div>
      ) : filteredOperations.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/60">
            {searchQuery || statusFilter || yearFilter
              ? "No operations found matching your filters."
              : "No operations found."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Type of Operation
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    VSL Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">
                    Barrels
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-white/90 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredOperations.map((op) => (
                  <tr key={op._id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white/90">
                        {formatDateTime(op.operationStartTime)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/90">
                        {op.typeOfOperation || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/90">
                        {op.location?.name || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          statusTone[op.operationStatus]?.pill ||
                          "bg-white/10 text-white"
                        }`}
                      >
                        {op.operationStatus || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/90">
                        {op.chs || op.ms || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/90">
                        {op.client || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-white/90">
                            {calculateBarrels(op.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2 justify-center">
                        <ActionViewIcon
                          onClick={() => router.push(`/operations/sts-operations/new/view/${op._id}`)}
                          title="View operation"
                        />
                        <ActionEditIcon
                          onClick={() => router.push(`/operations/sts-operations/new/edit/${op._id}`)}
                          title="Edit operation"
                        />
                        <ActionDeleteIcon onClick={() => handleDelete(op._id)} title="Delete operation" />
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
  );
}

function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="flex-1 border-t border-white/10" />
    </div>
  );
}

const StatusDropdown = forwardRef(function StatusDropdown(
  { status, onSelect, show, setShow, statuses },
  ref
) {
  const active = statuses.find((s) => s.key === status);
  const tone = statusTone[status] || {
    dot: "bg-white",
    pill: "bg-white/10 border-white/10 text-white",
    option: "text-white",
  };
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setShow((v) => !v)}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide border hover:bg-white/15 transition ${tone.pill}`}
      >
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {active?.label || status}
        <span className="text-white/80 text-base leading-none">▾</span>
      </button>
      {show && (
        <div className="absolute left-0 top-full z-30 mt-2 w-40 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl">
          <div className="p-2 space-y-1">
            {statuses.map((item) => (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  item.key === status
                    ? `${
                        statusTone[item.key]?.pill || "bg-white/10 text-white"
                      }`
                    : `${
                        statusTone[item.key]?.option || "text-white"
                      } hover:bg-white/10`
                }`}
              >
                <span
                  className={`mr-2 inline-block h-2 w-2 rounded-full ${
                    statusTone[item.key]?.dot || "bg-white"
                  }`}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function Label({ children }) {
  return (
    <label className="block text-sm font-semibold text-white/80 mb-2">
      {children}
    </label>
  );
}

function BaseInput({ children }) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus-within:ring-2 focus-within:ring-orange-500/40 focus-within:border-orange-500/40 transition">
      {children}
    </div>
  );
}

function TextField({ label, placeholder, name }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <BaseInput>
        <input
          type="text"
          name={name}
          className="w-full bg-transparent outline-none"
          placeholder={placeholder}
        />
      </BaseInput>
    </div>
  );
}

function NumberField({ label, placeholder, name, allowDecimals = true }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <BaseInput>
        <input
          type="text"
          inputMode="decimal"
          name={name}
          className="w-full bg-transparent outline-none"
          placeholder={placeholder}
          onWheel={(e) => e.target.blur()}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty, numbers, and optionally one decimal point
            const pattern = allowDecimals ? /^\d*\.?\d*$/ : /^\d*$/;
            if (value === "" || pattern.test(value)) {
              e.target.value = value;
            } else {
              e.target.value = e.target.value.slice(0, -1);
            }
          }}
        />
      </BaseInput>
    </div>
  );
}

function DateField({ label, name }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <BaseInput>
        <input
          type="date"
          name={name}
          className="w-full bg-transparent outline-none"
        />
      </BaseInput>
    </div>
  );
}

function SelectField({
  label,
  options = [],
  loading = false,
  name,
  multiple = false,
  placeholder,
  size,
  onChange,
}) {
  const [isPlaceholderSelected, setIsPlaceholderSelected] = useState(
    !multiple && !!placeholder
  );
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="relative">
        {!multiple && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-orange-300">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}

        <select
          name={name}
          multiple={multiple}
          size={size}
          defaultValue={!multiple ? "" : undefined}
          onChange={(e) => {
            if (!multiple && placeholder) {
              setIsPlaceholderSelected(e.target.value === "");
            }
            if (onChange) onChange(e.target.value);
          }}
          className={`w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm shadow-lg shadow-black/20 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/60 transition ${
            multiple ? "appearance-auto min-h-[160px]" : "appearance-none"
          } ${
            isPlaceholderSelected && !multiple
              ? "text-white/60 font-normal"
              : "text-white font-semibold"
          }`}
        >
          {/* Placeholder (ONLY for single select) */}
          {placeholder && !multiple && (
            <option value="" disabled hidden className="text-slate-900">
              {placeholder}
            </option>
          )}

          {loading && (
            <option disabled className="text-slate-900">
              Loading...
            </option>
          )}

          {!loading &&
            options.map((opt) => {
              const value = typeof opt === "object" ? opt.value : opt;
              const text = typeof opt === "object" ? opt.label : opt;

              return (
                <option
                  key={value ?? text}
                  value={value}
                  className="text-slate-900"
                >
                  {text}
                </option>
              );
            })}
        </select>
      </div>
    </div>
  );
}


function FileField({ name, resetKey }) {
  const [fileUrl, setFileUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setFileUrl("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [resetKey]);

  return (
    <div className="w-full text-sm text-white/80">
      <div className="flex items-center gap-2">
      <input
        ref={inputRef}
          type="text"
        name={name}
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="Enter file URL/path"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
        />
        {fileUrl && (
          <ActionDownloadIcon
            onClick={() => fileUrl && window.open(fileUrl, "_blank")}
            title="Open or download"
            className="!rounded-xl !p-3"
          />
        )}
      </div>
    </div>
  );
}

function UploadPill({ label, description, name, accent = "sky", resetKey }) {
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [resetKey]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const borderColor =
    accent === "orange"
      ? "border-orange-400/40"
      : "border-sky-400/40";
  const accentBg =
    accent === "orange"
      ? "bg-orange-500/10"
      : "bg-sky-500/10";
  const accentText =
    accent === "orange"
      ? "text-orange-300"
      : "text-sky-300";
  const btnBg =
    accent === "orange"
      ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-200"
      : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-200";
  
  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${accentText}`}>{label}</span>
        {description && (
          <span className="text-xs text-white/40">— {description}</span>
        )}
      </div>

      {/* Upload area */}
      <div className={`flex items-center gap-2 rounded-xl border ${borderColor} ${accentBg} px-3 py-2`}>
        <label
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${btnBg}`}
        >
          Choose File
          <input
            ref={inputRef}
            type="file"
            name={name}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
          />
        </label>
        <span className="flex-1 text-sm text-white/60 truncate">
          {fileName || "No file chosen"}
        </span>
        {fileName && (
          <button
            type="button"
            onClick={handleClear}
            className="text-red-400 hover:text-red-300 text-sm font-bold px-1"
            title="Remove file"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function ActionUpload({ label, name, resetKey, externalValue, onClear }) {
  const [fileUrl, setFileUrl] = useState("");
  const [isAutoFetched, setIsAutoFetched] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFileUrl("");
    setIsAutoFetched(false);
    setUploadedFileName("");
    if (inputRef.current) inputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [resetKey]);

  useEffect(() => {
    if (externalValue !== undefined && externalValue !== null && externalValue !== "") {
      setFileUrl(externalValue);
      setIsAutoFetched(true);
      setUploadedFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (externalValue === "") {
      if (isAutoFetched) {
        setFileUrl("");
        setIsAutoFetched(false);
      }
    }
  }, [externalValue]);

  const handleClear = (e) => {
    e.preventDefault();
    setFileUrl("");
    setIsAutoFetched(false);
    setUploadedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear?.();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFileName(file.name);
  };

  const handleClearUpload = (e) => {
    e.preventDefault();
    setUploadedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-white/90">{label}</label>

      {/* Hidden URL input — only included when no file is being uploaded */}
      {!uploadedFileName && (
        <input type="hidden" name={name} value={fileUrl} />
      )}

      {/* File input always in DOM so FormData picks it up on submit */}
      <input
        ref={fileInputRef}
        type="file"
        name={`${name}File`}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
        onChange={handleFileUpload}
      />

      {uploadedFileName ? (
        /* User uploaded a replacement file */
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3">
            <span className="text-sky-300 text-sm truncate">📄 {uploadedFileName}</span>
          </div>
          {isAutoFetched && fileUrl && (
            <ActionDownloadIcon
              onClick={() => window.open(fileUrl, "_blank")}
              title="Download original"
              className="!rounded-xl !p-3"
            />
          )}
          <button
            type="button"
            onClick={handleClearUpload}
            className="px-3 py-3 rounded-xl bg-red-500/20 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition"
            title="Remove uploaded file"
          >
            ✕
          </button>
        </div>
      ) : isAutoFetched && fileUrl ? (
        /* Auto-fetched: download + upload-replace + clear */
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
            <span className="text-emerald-300 text-sm">✓ File linked from location</span>
          </div>
          <ActionDownloadIcon
            onClick={() => fileUrl && window.open(fileUrl, "_blank")}
            title="Open or download"
            className="!rounded-xl !p-3"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-3 rounded-xl bg-sky-500/20 text-sky-300 text-xs font-semibold hover:bg-sky-500/30 transition whitespace-nowrap"
            title="Upload replacement file"
          >
            ↑ Replace
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-3 rounded-xl bg-red-500/20 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ) : (
        /* Manual entry */
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="Enter file URL/path"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
          />
          {fileUrl && (
            <ActionDownloadIcon
              onClick={() => fileUrl && window.open(fileUrl, "_blank")}
              title="Open or download"
              className="!rounded-xl !p-3"
            />
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ label, name, resetKey }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/90">{label}</label>
      <FileField name={name} resetKey={resetKey} />
    </div>
  );
}

function TextAreaField({ label, placeholder, name }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <textarea
        name={name}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function MultiSelectDropdown({
  label,
  options = [],
  loading = false,
  name,
  resetKey,
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);

  const toggle = (val) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const summaryLabel = (() => {
    if (selected.length) {
      const selectedLabels = selected
        .map((val) => options.find((opt) => opt.value === val)?.label)
        .filter(Boolean);
      return selectedLabels.join(", ") || `${selected.length} selected`;
    }
    if (loading) return "Loading...";
    return "Select equipment";
  })();

  useEffect(() => {
    setSelected([]);
  }, [resetKey]);

  return (
    <div className="space-y-2 relative">
      <Label>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400/60 transition"
        >
          <span className="truncate">{summaryLabel}</span>
          <svg
            className={`h-4 w-4 text-orange-300 transition ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur shadow-2xl max-h-64 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-sm text-white/70">Loading...</div>
            )}
            {!loading && !options.length && (
              <div className="px-4 py-3 text-sm text-white/60">
                No available equipment
              </div>
            )}
            {!loading &&
              options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/50 bg-transparent text-orange-400 focus:ring-orange-400"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
          </div>
        )}
      </div>
      {/* Hidden inputs for form submission */}
      {selected.map((val) => (
        <input key={val} type="hidden" name={name} value={val} />
      ))}
    </div>
  );
}

function LinkedFormCard({ form, operationDocuments = [] }) {
  const { formCode, label, filled, count, docs } = form;
  const latestDoc = docs?.[0];
  const filePath =
    filled && latestDoc
      ? resolveLinkedFormFilePath(operationDocuments, formCode, latestDoc._id)
      : null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        filled
          ? "border-emerald-500/30 bg-emerald-900/10 hover:bg-emerald-900/20"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-orange-300 truncate">{formCode}</p>
          <p className="text-sm font-semibold text-white truncate">{label}</p>
        </div>
        <span
          className={`flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
            filled
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-500/20 text-slate-400"
          }`}
        >
          {filled ? `Filled (${count})` : "Pending"}
        </span>
      </div>

      {filled && latestDoc && (
        <div className="mt-2 space-y-1 text-[11px] text-white/60">
          <p>Seq: <span className="text-sky-300 font-mono">{latestDoc.sequenceNumber || "—"}</span></p>
          <p>Status: <span className={
            latestDoc.status === "SUBMITTED" || latestDoc.status === "APPROVED"
              ? "text-emerald-300" : "text-amber-300"
          }>{latestDoc.status}</span></p>
          <p>Date: {latestDoc.createdAt
            ? new Date(latestDoc.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—"}</p>
          <p className="mt-1">
            File:{" "}
            <span className={filePath ? "text-emerald-400 font-medium" : "text-white/50"}>
              {filePath ? "Yes" : "No"}
            </span>
          </p>
          {filePath && (
            <a
              href={filePath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-orange-400/40 bg-orange-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-orange-200 hover:bg-orange-500/25 transition"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ArrowIcon({ direction = "left" }) {
  if (direction === "both") {
    return (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        viewBox="0 0 200 200"
      >
        <path
          d="M120 40 L60 100 L120 160"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M80 40 L140 100 L80 160"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="60" y1="100" x2="140" y2="100" strokeLinecap="round" />
      </svg>
    );
  }
  const isLeft = direction === "left";
  return (
    <svg
      className={`h-6 w-6 ${isLeft ? "" : "rotate-180"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      viewBox="0 0 200 200"
    >
      <path
        d="M120 40 L60 100 L120 160"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="60" y1="100" x2="180" y2="100" strokeLinecap="round" />
    </svg>
  );
}
