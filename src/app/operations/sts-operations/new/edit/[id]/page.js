"use client";

import Link from "next/link";
import { useState, useEffect, useRef, forwardRef } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";

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

export default function EditOperationPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
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
  const [loading, setLoading] = useState(true);
  const formRef = useRef(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [operationData, setOperationData] = useState(null);
  const cycleFlowDir = () =>
    setFlowDir((d) => {
      if (d === "left") return "right";
      if (d === "right") return "both";
      return "left";
    });

  // Calculate barrels from metric tons (approximate conversion: 1 MT ≈ 7.33 barrels)
  const [quantityMT, setQuantityMT] = useState("");
  const [quantityBarrels, setQuantityBarrels] = useState("");
  const [preStsDocs, setPreStsDocs] = useState({ jpo: "", riskAssessment: "" });

  /* Auto-fetch Pre-STS docs (JPO, Risk Assessment) when location changes */
  const handleLocationChange = async (locationId) => {
    if (!locationId || locationId === "Select") {
      setPreStsDocs({ jpo: "", riskAssessment: "" });
      return;
    }
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

  useEffect(() => {
    setQuantityMT("");
    setQuantityBarrels("");
  }, [formResetKey]);

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

  // Fetch operation data
  useEffect(() => {
    const fetchOperation = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await fetch(`/api/operations/sts/${id}`);
        const data = await response.json();

        if (data.success && data.data) {
          const op = data.data;
          setOperationData(op);
          setStatus(op.operationStatus || "INPROGRESS");
          setFlowDir(op.flowDirection || "left");
          setQuantityMT(op.quantity?.toString() || "");
          
          // Check if operation is submitted
          if (op.isSubmitted) {
            alert("This operation has been submitted and cannot be edited.");
            router.push("/operations/sts-operations/new/list");
            return;
          }
        } else {
          alert("Operation not found");
          router.push("/operations/sts-operations/new/list");
        }
      } catch (error) {
        console.error("Error fetching operation:", error);
        alert("Failed to load operation");
        router.push("/operations/sts-operations/new/list");
      } finally {
        setLoading(false);
      }
    };

    fetchOperation();
  }, [id, router]);

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

  // Populate form fields when operation data and form are ready
  useEffect(() => {
    if (operationData && formRef.current && !loadingMasters) {
      const op = operationData;
      
      // Basic text fields
      if (op.Operation_Ref_No) {
        const refNoInput = formRef.current.querySelector('input[name="Operation_Ref_No"]');
        if (refNoInput) refNoInput.value = op.Operation_Ref_No;
      }
      if (op.client) {
        const clientInput = formRef.current.querySelector('input[name="client"]');
        if (clientInput) clientInput.value = op.client;
      }
      if (op.chs) {
        const chsInput = formRef.current.querySelector('input[name="chs"]');
        if (chsInput) chsInput.value = op.chs;
      }
      if (op.ms) {
        const msInput = formRef.current.querySelector('input[name="ms"]');
        if (msInput) msInput.value = op.ms;
      }
      if (op.remarks) {
        const remarksInput = formRef.current.querySelector('textarea[name="remarks"]');
        if (remarksInput) remarksInput.value = op.remarks;
      }

      // Select fields
      if (op.typeOfOperation) {
        const typeSelect = formRef.current.querySelector('select[name="typeOfOperation"]');
        if (typeSelect) typeSelect.value = op.typeOfOperation;
      }
      if (op.mooringMaster) {
        const mmId = op.mooringMaster._id || op.mooringMaster;
        const mmSelect = formRef.current.querySelector('select[name="mooringMaster"]');
        if (mmSelect && mmId) mmSelect.value = mmId;
      }
      if (op.location) {
        const locId = op.location._id || op.location;
        const locSelect = formRef.current.querySelector('select[name="location"]');
        if (locSelect && locId) locSelect.value = locId;
      }
      if (op.typeOfCargo) {
        const cargoId = op.typeOfCargo._id || op.typeOfCargo;
        const cargoSelect = formRef.current.querySelector('select[name="typeOfCargo"]');
        if (cargoSelect && cargoId) cargoSelect.value = cargoId;
      }
      if (op.vesselTypeCHS) {
        const vesselCHSSelect = formRef.current.querySelector('select[name="vesselTypeCHS"]');
        if (vesselCHSSelect) vesselCHSSelect.value = op.vesselTypeCHS;
      }
      if (op.vesselTypeMS) {
        const vesselMSSelect = formRef.current.querySelector('select[name="vesselTypeMS"]');
        if (vesselMSSelect) vesselMSSelect.value = op.vesselTypeMS;
      }

      // Date fields
      if (op.operationStartTime) {
        const startDate = new Date(op.operationStartTime);
        const startStr = startDate.toISOString().slice(0, 16);
        const startInput = formRef.current.querySelector('input[name="operationStartTime"]');
        if (startInput) startInput.value = startStr;
      }
      if (op.operationEndTime) {
        const endDate = new Date(op.operationEndTime);
        const endStr = endDate.toISOString().slice(0, 16);
        const endInput = formRef.current.querySelector('input[name="operationEndTime"]');
        if (endInput) endInput.value = endStr;
      }

      // Equipment checkboxes
      if (op.equipments && Array.isArray(op.equipments)) {
        op.equipments.forEach((eq) => {
          const equipmentId = eq.equipment?._id || eq.equipment;
          if (equipmentId) {
            const checkbox = formRef.current.querySelector(`input[name="equipments"][value="${equipmentId}"]`);
            if (checkbox) checkbox.checked = true;
          }
        });
      }

      // File URL fields (now strings instead of file uploads)
      const fileFields = [
        "chsSSQ", "chsQ88", "chsGAPlan", "chsMSDS", "chsMooringArrangement", "chsIndemnity",
        "msSSQ", "msQ88", "msGAPlan", "msMSDS", "msMooringArrangement", "msIndemnity",
        "jpo", "riskAssessment", "mooringPlan", "DeclarationAtSea",
        "checklist1", "checklist2", "checklist3AB", "checklist4AF", "checklist5AC", "checklist6AB", "checklist7",
        "stsTimesheet", "standingOrder", "stsEquipChecklistPriorOps", "stsEquipChecklistAfterOps",
        "chsFeedback", "msFeedback", "hourlyChecks", "restHoursCKL", "incidentReporting"
      ];

      fileFields.forEach((field) => {
        if (op[field]) {
          const fileInput = formRef.current.querySelector(`input[name="${field}"]`);
          if (fileInput) fileInput.value = op[field];
        }
      });
    }
  }, [operationData, loadingMasters]);

  const handleSubmit = async (e, isSubmit = false) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check if operation is already submitted
      if (operationData?.isSubmitted) {
        alert("This operation has been submitted and cannot be updated.");
        return;
      }

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

      const response = await fetch(`/api/operations/sts/${id}/update`, {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update operation");
      }

      // Show success and redirect
      alert("STS Operation updated successfully!");
      router.push("/operations/sts-operations/new/list");
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center" style={{
        backgroundImage:
          "url('https://res.cloudinary.com/dtqvb1uhi/image/upload/v1765800114/gettyimages-1317779371-612x612_nurxsk.jpg')",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "repeat",
        backgroundColor: "#0b2740",
      }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-white/60">Loading operation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-transparent text-white flex"
      //background image for the form
      style={{
        backgroundImage:
          "url('https://res.cloudinary.com/dtqvb1uhi/image/upload/v1765800114/gettyimages-1317779371-612x612_nurxsk.jpg')",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "repeat",
        backgroundColor: "#0b2740",
      }}
    >
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
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition border border-orange-400/30 shadow-lg shadow-orange-500/30 hover:scale-110"
          aria-label="Open sidebar"
        >
          <span className="text-white text-xl">☰</span>
        </button>
      )}

      {/* Main Content - fixed left margin so content stays in place when sidebar collapses */}
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
              <h1 className="text-2xl font-bold">Edit STS Operation</h1>
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => router.push("/operations/sts-operations/new/list")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition hover:scale-110"
                aria-label="Close"
                title="Close without saving"
              >
                <span className="text-white text-xl">×</span>
              </button>
              <div
                className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide md:flex ${
                  statusTone[status]?.pill ||
                  "bg-white/10 border-white/10 text-white"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    statusTone[status]?.dot || "bg-white"
                  }`}
                />
                {statuses.find((s) => s.key === status)?.label || status}
              </div>
            </div>
          </header>

          <form
            ref={formRef}
            onSubmit={(e) => e.preventDefault()}
            className="rounded-3xl border border-white/10 bg-[#0b2740]/90 p-6 backdrop-blur shadow-2xl space-y-6 max-w-6xl mx-auto"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
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
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span className="text-lg">⏱️</span>
                <div className="flex items-center gap-2">
                  <span>Start</span>
                  <input
                    type="datetime-local"
                    name="operationStartTime"
                    required
                    className="w-48 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>End</span>
                  <input
                    type="datetime-local"
                    name="operationEndTime"
                    className="w-48 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                  />
                </div>
              </div>
            </div>

            {/* Top-line details */}
            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Operation Ref No"
                placeholder="Enter reference"
                name="Operation_Ref_No"
              />
              <SelectField
                  label="Type of operation"
                  name="typeOfOperation"
                  placeholder="Select type of operation"
                  options={["Ship to Ship", "POAC", "Fender Hire", "Hose hire", "STS Equipment Hire"]}
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
              <TextField
                label="LOA"
                name="loa"
                placeholder="Enter LOA"
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
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-inner space-y-6">
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
                    label="What type of vessel (CHS)"
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
                  <UploadPill
                    label="SSQ"
                    name="chsSSQ"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Q88"
                    name="chsQ88"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Mooring Arr."
                    name="chsMooringArrangement"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="GA Plan"
                    name="chsGAPlan"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="MSDS"
                    name="chsMSDS"
                    accent="sky"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Indemnity"
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
                    label="What type of vessel (MS)"
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
                  <UploadPill
                    label="SSQ"
                    name="msSSQ"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Q88"
                    name="msQ88"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Mooring Arr."
                    name="msMooringArrangement"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="GA Plan"
                    name="msGAPlan"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="MSDS"
                    name="msMSDS"
                    accent="orange"
                    resetKey={formResetKey}
                  />
                  <UploadPill
                    label="Indemnity"
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
                defaultValue={operationData?.jpo}
                externalValue={preStsDocs.jpo}
              />
              <ActionUpload
                label="Risk Assessment"
                name="riskAssessment"
                resetKey={formResetKey}
                defaultValue={operationData?.riskAssessment}
                externalValue={preStsDocs.riskAssessment}
              />
              <ActionUpload
                label="Mooring Plan"
                name="mooringPlan"
                resetKey={formResetKey}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FileRow
                label="Standing Order"
                name="standingOrder"
                resetKey={formResetKey}
              />
             
            </div>

            {/* STS Equipment */}
            <SectionTitle title="STS Equipment" />
            <div className="grid gap-4 md:grid-cols-2">
              <FileRow
                label="Equip Checklist (B)"
                name="stsEquipChecklistPriorOps"
                resetKey={formResetKey}
              />
              <FileRow
                label="Equip Checklist (A)"
                name="stsEquipChecklistAfterOps"
                resetKey={formResetKey}
              />
            </div>

            {/* Checklists 1–7 */}
            <SectionTitle title="Checklists" />
            <div className="grid gap-4 md:grid-cols-3">
              <FileRow label="Checklist 1" name="checklist1" />
              <FileRow label="Checklist 2" name="checklist2" />
              <FileRow label="Checklist 3A & B" name="checklist3AB" />
              <FileRow label="Checklist 4A-F" name="checklist4AF" />
              <FileRow label="Checklist 5A-C" name="checklist5AC" />
              <FileRow label="Checklist 6A & B" name="checklist6AB" />
              <FileRow label="Checklist 7" name="checklist7" />
              <FileRow
                label="Declaration at Sea"
                name="DeclarationAtSea"
                resetKey={formResetKey}
              />
            </div>

            {/* Feedback & Logs */}
            <SectionTitle title="Feedback & Logs" />
            <div className="grid gap-4 md:grid-cols-3">
              <FileRow
                label="CHS feedback"
                name="chsFeedback"
                resetKey={formResetKey}
              />
              <FileRow
                label="MS feedback"
                name="msFeedback"
                resetKey={formResetKey}
              />
              <FileRow
                label="Hourly Checks"
                name="hourlyChecks"
                resetKey={formResetKey}
              />
              <FileRow
                label="Rest hours CKL"
                name="restHoursCKL"
                resetKey={formResetKey}
              />
              <FileRow
                label="Incident Reporting"
                name="incidentReporting"
                resetKey={formResetKey}
              />
              <FileRow
                label="STS Timesheet"
                name="stsTimesheet"
                resetKey={formResetKey}
              />
            </div>

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
                initialSelected={operationData?.equipments?.map((eq) => {
                  const eqId = eq.equipment?._id || eq.equipment;
                  return eqId ? String(eqId) : null;
                }).filter(Boolean) || []}
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
                  router.push("/operations/sts-operations/new/list");
                }}
                className="px-6 py-3 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={submitting || operationData?.isSubmitted}
                className="px-6 py-3 rounded-xl border border-blue-400/30 bg-blue-500/20 text-blue-300 font-semibold hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={submitting || operationData?.isSubmitted}
                className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
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


function FileField({ name, resetKey, defaultValue }) {
  const [fileUrl, setFileUrl] = useState(defaultValue || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (resetKey === 0 && defaultValue) {
      setFileUrl(defaultValue);
    } else if (resetKey > 0) {
      setFileUrl("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    }
  }, [resetKey, defaultValue]);

  const handleDownload = (e) => {
    e.preventDefault();
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

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
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition whitespace-nowrap"
          >
            Download
          </button>
        )}
      </div>
    </div>
  );
}

function UploadPill({ label, name, accent = "sky", resetKey, defaultValue }) {
  const [fileUrl, setFileUrl] = useState(defaultValue || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (resetKey === 0 && defaultValue) {
      setFileUrl(defaultValue);
    } else if (resetKey > 0) {
      setFileUrl("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    }
  }, [resetKey, defaultValue]);

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const color =
    accent === "orange"
      ? "border-orange-400/50 text-orange-50 bg-orange-500/10 hover:bg-orange-500/15"
      : "border-sky-400/50 text-sky-50 bg-sky-500/10 hover:bg-sky-500/15";
  
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="Enter file URL/path"
        className={`w-full rounded-full border px-4 py-2 text-sm font-semibold bg-transparent text-white placeholder:text-white/50 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition outline-none ${color}`}
      />
      {fileUrl && (
      <button
        type="button"
          onClick={handleDownload}
          className="text-xs text-emerald-300 hover:text-emerald-200 underline mt-1 text-left"
              >
          Click to download
      </button>
      )}
    </div>
  );
}

function ActionUpload({ label, name, resetKey, defaultValue, externalValue }) {
  const [fileUrl, setFileUrl] = useState(defaultValue || "");
  const [isAutoFetched, setIsAutoFetched] = useState(false);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (resetKey === 0 && defaultValue) {
      setFileUrl(defaultValue);
    } else if (resetKey > 0) {
      setFileUrl("");
      setIsAutoFetched(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [resetKey, defaultValue]);

  // Update from external auto-fetch (e.g. location-based JPO/Risk Assessment)
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== null && externalValue !== "") {
      setFileUrl(externalValue);
      setIsAutoFetched(true);
    } else if (externalValue === "") {
      if (isAutoFetched) {
        setFileUrl(defaultValue || "");
        setIsAutoFetched(false);
      }
    }
  }, [externalValue]);

  const handleDownload = (e) => {
    e.preventDefault();
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    setFileUrl("");
    setIsAutoFetched(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-white/90">{label}</label>
      {/* Hidden input to keep value in form */}
      <input type="hidden" name={name} value={fileUrl} />

      {isAutoFetched && fileUrl ? (
        /* Auto-fetched: show clean download button only */
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
            <span className="text-emerald-300 text-sm">✓ File linked from location</span>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition"
          >
            Download
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
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition"
            >
              Download
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FileRow({ label, name, resetKey, defaultValue }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/90">{label}</label>
      <FileField name={name} resetKey={resetKey} defaultValue={defaultValue} />
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
  initialSelected = [],
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(initialSelected || []);

  const toggle = (val) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const summaryLabel = (() => {
    if (selected.length) return `${selected.length} selected`;
    if (loading) return "Loading...";
    return "Select equipment";
  })();

  useEffect(() => {
    if (resetKey === 0 && initialSelected.length > 0) {
      setSelected(initialSelected);
    } else if (resetKey > 0) {
      setSelected([]);
    }
  }, [resetKey, initialSelected]);

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
