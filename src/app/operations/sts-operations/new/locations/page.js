"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";
import { ActionEditIcon, ActionDeleteIcon } from "@/app/components/RecordActionIcons";
import { useOperationsRole } from "@/hooks/useOperationsRole";
import {
  getSidebarTabs,
  isFormsSubmoduleSidebarActive,
} from "@/app/operations/sts-operations/new/sidebarTabs";
import { useOperationsClientPagination } from "@/app/operations/hooks/useOperationsClientPagination";
import OperationsListPaginationFooter from "@/app/operations/components/OperationsListPaginationFooter";
import OperationsSelectField from "@/app/operations/components/OperationsSelectField";

const OFFICE_CHECK_LABELS = {
  jpo: "JPO",
  riskAssessment: "Risk Assessment",
  stsTransferLocationChecklist: "STS Transfer Location Checklist",
  stsNewBaseChecklist: "STS New Base Checklist",
  moc: "MOC",
  mocRa: "MOC -RA",
  preArrivalNotification: "Pre Arrival Notification",
  contingencyPlan: "Contingency plan",
  costing: "Costing",
};

const EMPTY_OFFICE_CHECKS = Object.fromEntries(Object.keys(OFFICE_CHECK_LABELS).map((key) => [key, false]));

const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches API per-file limit
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024; // matches proxyClientMaxBodySize in next.config.mjs

// Year range for dropdown (e.g. current year - 5 to current year + 2)
function getYearsRange() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 2; y++) {
    years.push(y);
  }
  return years.sort((a, b) => b - a);
}

const normalizeLocationName = (name) => (name || "").trim().replace(/\s+/g, " ").toLowerCase();

// Validate optional coordinate input; returns an error message or "" if OK
function validateCoordinate(raw, label, min, max) {
  const v = raw.trim();
  if (!v) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number (e.g. 25.12).`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return "";
}

// Turn a failed location API response into a message the user can act on
async function getLocationApiError(res, fallback) {
  let serverMessage = "";
  try {
    const data = await res.json();
    serverMessage = data?.error || data?.message || "";
  } catch {
    // non-JSON response
  }
  if (/already exists/i.test(serverMessage)) {
    return "This location already exists. Search for it in the list below to edit its coordinates.";
  }
  if (res.status === 413 || /parse body as FormData/i.test(serverMessage)) {
    return "The files are too large to upload together (30MB total). Please upload fewer or smaller files at a time.";
  }
  if (res.status === 401) return "Your session has expired. Please log in again.";
  if (res.status === 403) return "You don't have permission to manage locations. Operations admin role is required.";
  if (res.status === 404) return "This location no longer exists. Please refresh the page.";
  if (res.status >= 500) return `Something went wrong on the server. Please try again.${serverMessage ? ` (${serverMessage})` : ""}`;
  return serverMessage || fallback;
}

export default function LocationsPage() {
  const pathname = usePathname();
  const { canManageMasterData, isOpsAdmin } = useOperationsRole();

  // --- Manage locations (master data) ---
  const [items, setItems] = useState([]);
  const [value, setValue] = useState("");
  const [latValue, setLatValue] = useState("");
  const [lngValue, setLngValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const { isSidebarOpen, setIsSidebarOpen } = useOperationsSidebar();
  const [activeTab, setActiveTab] = useState("locations");
  const [expandedModules, setExpandedModules] = useState(new Set());
  const sidebarRef = useRef(null);

  // --- Office checks section ---
  const [section, setSection] = useState("locations"); // "locations" | "office-checks"
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [years, setYears] = useState(() => getYearsRange());
  const [officeView, setOfficeView] = useState("form"); // "form" | "list"
  const [records, setRecords] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [officeChecks, setOfficeChecks] = useState(EMPTY_OFFICE_CHECKS);
  // Saved record for the selected location + year (pre-fills the form so a re-save doesn't wipe it)
  const [existingOfficeRecord, setExistingOfficeRecord] = useState(null);
  const [loadingOfficeRecord, setLoadingOfficeRecord] = useState(false);
  const [checkboxFiles, setCheckboxFiles] = useState({});
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const additionalInputRefs = useRef([]);

  const filteredItems = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name?.toLowerCase().includes(q));
  }, [items, locationSearch]);

  const locPag = useOperationsClientPagination(filteredItems, `locations-master|${locationSearch}`);
  const { paginatedItems: locPageItems, ...locFooterProps } = locPag;
  const recPag = useOperationsClientPagination(records, `${selectedLocationId}|${year}`);
  const { paginatedItems: recPageItems, ...recFooterProps } = recPag;

  // Set active tab based on pathname
  useEffect(() => {
    if (pathname === "/operations/sts-operations/new") {
      setActiveTab("documentation");
    } else if (pathname.startsWith("/operations/sts-operations/new/compatibility")) {
      setActiveTab("compatibility");
    } else if (pathname.startsWith("/operations/sts-operations/new/form-checklist")) {
      setActiveTab("forms");
      // Auto-expand forms module
      setExpandedModules((prev) => new Set([...prev, "forms"]));
    } else if (pathname.startsWith("/operations/sts-operations/new/locations")) {
      setActiveTab("locations");
    } else if (pathname.startsWith("/operations/sts-operations/new/cargos")) {
      setActiveTab("cargos");
    } else if (pathname.startsWith("/operations/sts-operations/new/clients-agents")) {
      setActiveTab("clientsAgents");
    } else if (pathname.startsWith("/operations/sts-operations/new/mooringmaster")) {
      setActiveTab("mooring");
    }
  }, [pathname]);

  // Load locations (master list for both sections)
  useEffect(() => {
    if (!canManageMasterData) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is defined below; run when access is granted
  }, [canManageMasterData]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/master/locations/list");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      const list = data?.locations || [];
      setItems(list);
      setLocations(list);
      if (list.length > 0 && !selectedLocationId) {
        setSelectedLocationId(list[0]._id);
        setSelectedLocationName(list[0].name);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLocationId && locations.length) {
      const loc = locations.find((l) => String(l._id) === String(selectedLocationId));
      setSelectedLocationName(loc ? loc.name : "");
    }
  }, [selectedLocationId, locations]);

  // Load years for office checks: merge API years with standard range so dropdown always has options
  useEffect(() => {
    if (!canManageMasterData) return;
    const loadYears = async () => {
      try {
        const res = await fetch("/api/operations/location/list");
        const baseYears = getYearsRange();
        if (!res.ok) {
          setYears(baseYears);
          return;
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          setYears(baseYears);
          return;
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.years) && data.years.length > 0) {
          const merged = [...new Set([...baseYears, ...data.years])].sort((a, b) => b - a);
          setYears(merged);
        } else {
          setYears(baseYears);
        }
      } catch (_) {
        setYears(getYearsRange());
      }
    };
    loadYears();
  }, [canManageMasterData]);

  // Load office checks list when on list view
  useEffect(() => {
    if (!canManageMasterData) return;
    if (section !== "office-checks" || officeView !== "list" || !selectedLocationId) return;
    const loadRecords = async () => {
      setLoadingList(true);
      setError("");
      try {
        const url = `/api/operations/location/list?location=${encodeURIComponent(selectedLocationId)}&year=${year}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Response is not JSON");
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to load list");
        setRecords(data.data || []);
      } catch (err) {
        setError(err.message);
        setRecords([]);
      } finally {
        setLoadingList(false);
      }
    };
    loadRecords();
  }, [canManageMasterData, section, officeView, selectedLocationId, year]);

  const applyOfficeRecord = (record) => {
    setExistingOfficeRecord(record || null);
    setOfficeChecks({ ...EMPTY_OFFICE_CHECKS, ...(record?.officeChecks || {}) });
    setCheckboxFiles({});
    setAdditionalFiles([]);
    additionalInputRefs.current.forEach((ref) => { if (ref) ref.value = ""; });
  };

  // Load the saved office checks for the selected location + year into the form
  useEffect(() => {
    if (!canManageMasterData) return;
    if (section !== "office-checks" || officeView !== "form") return;
    if (!selectedLocationId) {
      applyOfficeRecord(null);
      return;
    }
    let cancelled = false;
    const loadOfficeRecord = async () => {
      setLoadingOfficeRecord(true);
      try {
        const url = `/api/operations/location/list?location=${encodeURIComponent(selectedLocationId)}&year=${year}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(await getLocationApiError(res, "Failed to load saved office checks."));
        const data = await res.json();
        if (!cancelled) applyOfficeRecord(data?.data?.[0] || null);
      } catch (err) {
        if (!cancelled) {
          applyOfficeRecord(null);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoadingOfficeRecord(false);
      }
    };
    loadOfficeRecord();
    return () => { cancelled = true; };
  }, [canManageMasterData, section, officeView, selectedLocationId, year]);

  const handleSubmitLocation = async (e) => {
    e.preventDefault();
    setError("");
    if (!value.trim()) {
      setError("Please enter a location name.");
      return;
    }

    const duplicate = items.find((item) => normalizeLocationName(item.name) === normalizeLocationName(value));
    if (duplicate) {
      setError(`"${duplicate.name}" already exists. Use the edit button in the list below to change its coordinates.`);
      setLocationSearch(duplicate.name);
      return;
    }

    const coordError =
      validateCoordinate(latValue, "Latitude", -90, 90) ||
      validateCoordinate(lngValue, "Longitude", -180, 180);
    if (coordError) {
      setError(coordError);
      return;
    }

    try {
      setLoading(true);
      const payload = { name: value.trim() };
      if (latValue.trim()) payload.latitude = parseFloat(latValue.trim());
      if (lngValue.trim()) payload.longitude = parseFloat(lngValue.trim());

      const res = await fetch("/api/master/locations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await getLocationApiError(res, "Failed to add location."));
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error || "Failed to create");
      setValue("");
      setLatValue("");
      setLngValue("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoords = async (id) => {
    setError("");
    const coordError =
      validateCoordinate(editLat, "Latitude", -90, 90) ||
      validateCoordinate(editLng, "Longitude", -180, 180);
    if (coordError) {
      setError(coordError);
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/master/locations/${id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: editLat.trim() ? parseFloat(editLat.trim()) : null,
          longitude: editLng.trim() ? parseFloat(editLng.trim()) : null,
        }),
      });
      if (!res.ok) throw new Error(await getLocationApiError(res, "Failed to update location."));
      const data = await res.json();
      if (data.error) throw new Error(data.error || "Failed to update");
      setEditingId(null);
      setEditLat("");
      setEditLng("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startEditing = (item) => {
    setEditingId(item._id);
    setEditLat(item.latitude != null ? String(item.latitude) : "");
    setEditLng(item.longitude != null ? String(item.longitude) : "");
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    setError("");
    try {
      setActionLoading(true);
      const res = await fetch(`/api/master/locations/${id}/delete`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await getLocationApiError(res, "Failed to delete location."));
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error || "Failed to delete");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLocationChange = (e) => {
    const id = e.target.value;
    setSelectedLocationId(id);
    const loc = locations.find((l) => String(l._id) === String(id));
    setSelectedLocationName(loc ? loc.name : "");
  };

  const toggleCheck = (key) => {
    // Unticking drops any file picked for that check so it isn't uploaded
    if (officeChecks[key]) setCheckboxFiles((prev) => ({ ...prev, [key]: null }));
    setOfficeChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCheckboxFile = (key, file) => {
    setCheckboxFiles((prev) => ({ ...prev, [key]: file }));
  };

  const addAdditionalSlot = () => {
    setAdditionalFiles((prev) => [...prev, null]);
  };

  const setAdditionalFileAt = (index, file) => {
    setAdditionalFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const handleSubmitOfficeChecks = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedLocationId || !selectedLocationName) {
      setError("Please select a location");
      return;
    }

    // Only files for ticked checks are sent
    const checkboxUploads = Object.entries(checkboxFiles).filter(([key, file]) => file && officeChecks[key]);
    // Numbered without gaps: the API stops reading at the first missing additional_N
    const additionalUploads = additionalFiles.filter(Boolean).map((file, i) => [i, file]);
    const allFiles = [...checkboxUploads, ...additionalUploads].map(([, file]) => file);

    const tooBig = allFiles.find((file) => file.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is larger than 25MB. Please upload a smaller file.`);
      return;
    }
    const totalBytes = allFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_UPLOAD_BYTES) {
      setError(
        `The selected files add up to ${(totalBytes / 1024 / 1024).toFixed(1)}MB. You can upload up to 30MB per save. Please save some files now and the rest in a second save.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("locationId", selectedLocationId);
      formData.append("year", String(year));
      Object.keys(officeChecks).forEach((key) => {
        formData.append(key, officeChecks[key] ? "true" : "false");
      });
      checkboxUploads.forEach(([key, file]) => {
        formData.append(`attachment_${key}`, file);
      });
      additionalUploads.forEach(([i, file]) => {
        formData.append(`additional_${i}`, file);
      });
      const res = await fetch("/api/operations/location/create", { method: "POST", body: formData });
      if (!res.ok) {
        throw new Error(await getLocationApiError(res, "Failed to save office checks."));
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Save failed");
      setSuccess("Office checks saved successfully.");
      applyOfficeRecord(data.data);
      if (officeView === "list") {
        const url = `/api/operations/location/list?location=${encodeURIComponent(selectedLocationId)}&year=${year}`;
        const listRes = await fetch(url);
        if (listRes.ok) {
          const contentType = listRes.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const listData = await listRes.json();
            setRecords(listData.data || []);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (recordId, type, keyOrIndex) => {
    const params = new URLSearchParams({ type, ...(type === "checkbox" ? { key: keyOrIndex } : { index: keyOrIndex }) });
    window.open(`/api/operations/location/${recordId}/download?${params}`, "_blank");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const sidebarTabs = getSidebarTabs(isOpsAdmin);

  if (!canManageMasterData) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">&#128274;</div>
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-white/60">Only administrators can access master data management.</p>
          <a href="/operations/sts-operations/new" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition">
            Go to Documentation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full w-[260px] sm:w-[300px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/20 shadow-2xl backdrop-blur-md z-50 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        
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
            <button onClick={() => setIsSidebarOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition hover:scale-110" aria-label="Close sidebar">
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
                            const isActiveSub = isFormsSubmoduleSidebarActive(
                              pathname,
                              submodule.href
                            );
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
        <div className="fixed left-4 top-4 z-40 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition border border-orange-400/30 shadow-lg shadow-orange-500/30 hover:scale-110 sm:h-10 sm:w-10"
            aria-label="Open sidebar"
          >
            <span className="text-white text-xl">☰</span>
          </button>
          <Link
            href="/dashboard"
            className="md:hidden inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-black/25 backdrop-blur-md transition hover:bg-white/15"
          >
            ← Dashboard
          </Link>
          <Link
            href="/operations/sts-operations/new"
            className="md:hidden inline-flex max-w-[11rem] min-w-0 shrink items-center gap-1 truncate rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-semibold text-white/90 shadow-md backdrop-blur-md transition hover:bg-white/10"
            title="Back to STS form"
          >
            ← STS form
          </Link>
        </div>
      )}

      <div className={`flex-1 min-w-0 pr-4 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
        <div className={`w-full mx-auto py-6 sm:py-10 space-y-4 sm:space-y-6 ${isSidebarOpen ? "max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4" : "px-3 sm:px-6"}`}>
          <header className={`${isSidebarOpen ? "mt-0" : "mt-8"} mb-4 flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}>
            {/* Left: Dashboard */}
            <Link
              href="/dashboard"
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
            >
              ← Dashboard
            </Link>

            {/* Center: Heading */}
            <div className="flex w-full flex-col items-center text-center sm:w-auto sm:flex-1">
              <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Operations / Locations</p>
              <h1 className="text-xl sm:text-2xl font-bold">Locations</h1>
              <p className="text-xs text-slate-200 mt-1">Manage locations and office checks by location and year</p>
            </div>
            
            {/* Right: Action Buttons — desktop only */}
            <div className="hidden shrink-0 md:flex md:items-center md:gap-3">
              <Link href="/operations/sts-operations/new" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 border border-white/10 hover:bg-white/20 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to STS form
              </Link>
            </div>
          </header>

          {/* Section toggle + Office checks Form/List (same row on md+: tabs left, Form/List right) */}
          <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex min-w-0 justify-center md:justify-start">
              <div className="inline-flex max-w-full rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setSection("locations"); setError(""); setSuccess(""); }}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${section === "locations" ? "bg-orange-500 text-white" : "text-white/90 hover:bg-white/10"}`}
                >
                  Manage locations
                </button>
                <button
                  type="button"
                  onClick={() => { setSection("office-checks"); setError(""); setSuccess(""); }}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${section === "office-checks" ? "bg-orange-500 text-white" : "text-white/90 hover:bg-white/10"}`}
                >
                  Office checks
                </button>
              </div>
            </div>
            {section === "office-checks" && (
              <div className="flex shrink-0 justify-center md:justify-end">
                <div className="inline-flex max-w-full rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOfficeView("form")}
                    className={`px-3 py-1.5 text-[11px] font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${officeView === "form" ? "bg-orange-500 text-white" : "text-white/90 hover:bg-white/10"}`}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfficeView("list")}
                    className={`px-3 py-1.5 text-[11px] font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${officeView === "list" ? "bg-orange-500 text-white" : "text-white/90 hover:bg-white/10"}`}
                  >
                    List
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-3 text-red-200 text-sm">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-green-400/40 bg-green-950/40 px-4 py-3 text-green-200 text-sm">{success}</div>
          )}

          {/* --- Manage locations --- */}
          {section === "locations" && (
            <>
              {canManageMasterData && (
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 border border-orange-400/30">
                    <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Add Location</h2>
                    <p className="text-xs text-white/60 mt-0.5">Register new locations for operations</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitLocation} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter location name"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>
                    <div className="w-36">
                      <input
                        type="text"
                        value={latValue}
                        onChange={(e) => setLatValue(e.target.value)}
                        placeholder="Latitude"
                        inputMode="decimal"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>
                    <div className="w-36">
                      <input
                        type="text"
                        value={lngValue}
                        onChange={(e) => setLngValue(e.target.value)}
                        placeholder="Longitude"
                        inputMode="decimal"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>
                    <button type="submit" disabled={loading} className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:min-w-[140px] sm:gap-2 sm:px-6 sm:py-3.5 sm:text-sm">
                      {loading ? "Adding..." : "Add"}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 ml-1">
                    Latitude & Longitude are optional — used for showing markers on the Operations Map. Leave blank if unknown.
                  </p>
                </form>
              </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Location List</h2>
                    <p className="text-xs text-white/60 mt-0.5">Manage all operation locations</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
                      <input
                        type="search"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        placeholder="Search location..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white/80">
                      {locationSearch.trim() ? `${filteredItems.length} of ${items.length}` : items.length} {items.length === 1 ? "Item" : "Items"}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-4 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">#</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Latitude</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Longitude</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {locPageItems.map((item, idx) => (
                        <tr key={item._id || item.name} className="hover:bg-white/5">
                          <td className="px-4 py-4">{(locPag.page - 1) * locPag.pageSize + idx + 1}</td>
                          <td className="px-4 py-4 font-semibold text-white">{item.name}</td>
                          <td className="px-4 py-3">
                            {editingId === item._id ? (
                              <input
                                type="text"
                                value={editLat}
                                onChange={(e) => setEditLat(e.target.value)}
                                placeholder="Lat"
                                inputMode="decimal"
                                className="w-28 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            ) : (
                              <span className={`text-xs ${item.latitude != null ? "text-white" : "text-white/30"}`}>
                                {item.latitude != null ? item.latitude : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingId === item._id ? (
                              <input
                                type="text"
                                value={editLng}
                                onChange={(e) => setEditLng(e.target.value)}
                                placeholder="Lng"
                                inputMode="decimal"
                                className="w-28 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            ) : (
                              <span className={`text-xs ${item.longitude != null ? "text-white" : "text-white/30"}`}>
                                {item.longitude != null ? item.longitude : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {editingId === item._id ? (
                                <>
                                  <button type="button" onClick={() => handleUpdateCoords(item._id)} disabled={actionLoading} className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 border border-green-400/30 px-3 py-1.5 text-xs font-semibold text-green-200 hover:bg-green-500/20 disabled:opacity-50">
                                    Save
                                  </button>
                                  <button type="button" onClick={() => { setEditingId(null); setEditLat(""); setEditLng(""); }} className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10">
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                canManageMasterData ? (
                                  <>
                                    <ActionEditIcon
                                      onClick={() => startEditing(item)}
                                      title="Edit coordinates"
                                    />
                                    <ActionDeleteIcon
                                      onClick={() => handleDelete(item._id)}
                                      disabled={actionLoading}
                                      title="Delete location"
                                    />
                                  </>
                                ) : null
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!items.length && (
                        <tr>
                          <td className="px-4 py-12 text-center" colSpan={5}>
                            <p className="text-sm text-white/60">No locations found. Add your first location above.</p>
                          </td>
                        </tr>
                      )}
                      {items.length > 0 && !filteredItems.length && (
                        <tr>
                          <td className="px-4 py-12 text-center" colSpan={5}>
                            <p className="text-sm text-white/60">No locations match &quot;{locationSearch.trim()}&quot;.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <OperationsListPaginationFooter {...locFooterProps} />
              </div>
            </>
          )}

          {/* --- Office checks (QHSE-style: filters inside one record container) --- */}
          {section === "office-checks" && (
            <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm sm:rounded-3xl">
              <div className="border-b border-white/10 bg-white/[0.03] px-2 py-2 sm:px-4 sm:py-2.5">
                <div className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-end gap-2 sm:gap-3">
                  <div className="flex w-auto shrink-0 items-center gap-1 sm:gap-1.5">
                    <label
                      htmlFor="office-checks-year"
                      className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[10px]"
                    >
                      Year
                    </label>
                    <OperationsSelectField
                      id="office-checks-year"
                      ariaLabel="Year"
                      value={String(year)}
                      onChange={(v) => setYear(Number(v))}
                      options={years.map((y) => ({
                        value: String(y),
                        label: String(y),
                      }))}
                      triggerClassName="w-20 shrink-0 rounded-lg border border-white/10 bg-slate-900/50 py-1 pl-1.5 pr-8 text-[10px] leading-tight text-white focus:outline-none focus:ring-1 focus:ring-orange-500/60 sm:w-24 sm:py-1.5 sm:pl-2 sm:pr-8 sm:text-xs min-h-0"
                      className="w-auto shrink-0"
                    />
                  </div>
                  <div className="flex min-w-0 max-w-[min(100%,11rem)] shrink items-center gap-1 sm:max-w-[13rem] sm:gap-1.5">
                    <label
                      htmlFor="office-checks-location"
                      className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300 sm:text-[10px]"
                    >
                      <span className="sm:hidden">Loc</span>
                      <span className="hidden sm:inline">Location</span>
                    </label>
                    <OperationsSelectField
                      id="office-checks-location"
                      ariaLabel="Location"
                      value={selectedLocationId}
                      onChange={(v) => handleLocationChange({ target: { value: v } })}
                      options={[
                        { value: "", label: "—" },
                        ...locations.map((loc) => ({
                          value: String(loc._id),
                          label: loc.name,
                        })),
                      ]}
                      triggerClassName="min-w-0 w-28 max-w-full rounded-lg border border-white/10 bg-slate-900/50 py-1 pl-1.5 pr-8 text-[10px] leading-tight text-white focus:outline-none focus:ring-1 focus:ring-orange-500/60 sm:w-36 sm:py-1.5 sm:pl-2 sm:pr-8 sm:text-xs min-h-0"
                      className="min-w-0 max-w-full shrink"
                    />
                  </div>
                </div>
              </div>

              {officeView === "form" && (
                <form onSubmit={handleSubmitOfficeChecks} className="space-y-8 p-4 sm:p-6">
                  {loadingOfficeRecord && (
                    <p className="text-xs text-white/60">Loading saved office checks…</p>
                  )}
                  {!loadingOfficeRecord && existingOfficeRecord && (
                    <p className="rounded-xl border border-sky-400/30 bg-sky-950/30 px-4 py-2 text-xs text-sky-200">
                      Showing what is already saved for {existingOfficeRecord.locationName} {existingOfficeRecord.year}
                      {existingOfficeRecord.uploadedBy?.name ? ` (last updated by ${existingOfficeRecord.uploadedBy.name})` : ""}.
                      Saving keeps existing files unless you upload a replacement or untick the check.
                    </p>
                  )}
                  <section>
                    <h2 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-3 mb-4">Office Checks</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(OFFICE_CHECK_LABELS).map(([key, label]) => {
                        const savedAttachment = (existingOfficeRecord?.checkboxAttachments || []).find((a) => a.key === key);
                        return (
                          <div key={key} className="flex flex-col gap-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={officeChecks[key] || false} onChange={() => toggleCheck(key)} className="rounded border-white/30 bg-white/5 text-green-500 focus:ring-orange-500" />
                              <span className="text-sm text-white/90">{label}</span>
                            </label>
                            {officeChecks[key] && (
                              <div className="ml-6">
                                {savedAttachment && !checkboxFiles[key] && (
                                  <p className="mb-1 text-xs text-white/60">
                                    Current file:{" "}
                                    <button type="button" onClick={() => handleDownload(existingOfficeRecord._id, "checkbox", key)} className="text-sky-300 hover:underline">
                                      {savedAttachment.fileName}
                                    </button>
                                  </p>
                                )}
                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => handleCheckboxFile(key, e.target.files?.[0] || null)} className="block w-full text-xs text-slate-200 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-white file:text-xs cursor-pointer" />
                                {checkboxFiles[key] && (
                                  <p className="mt-1 text-xs text-white/60">
                                    Selected: {checkboxFiles[key].name}
                                    {savedAttachment ? " (will replace the current file)" : ""}
                                  </p>
                                )}
                              </div>
                            )}
                            {!officeChecks[key] && savedAttachment && (
                              <p className="ml-6 text-xs text-amber-300/80">Unticked: the saved file will be removed from this record when you save.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section>
                    <h2 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-3 mb-4">Additional Attachments</h2>
                    {(existingOfficeRecord?.additionalAttachments || []).length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="text-xs text-white/60">Already saved:</span>
                        {existingOfficeRecord.additionalAttachments.map((att, i) => (
                          <button key={att._id || i} type="button" onClick={() => handleDownload(existingOfficeRecord._id, "additional", i)} className="text-xs text-sky-300 hover:underline">
                            {att.fileName}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="space-y-3">
                      {additionalFiles.map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input ref={(el) => { additionalInputRefs.current[index] = el; }} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setAdditionalFileAt(index, e.target.files?.[0] || null)} className="flex-1 text-xs text-slate-200 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-1.5 file:text-white file:text-xs cursor-pointer" />
                          {additionalFiles[index] && <span className="text-xs text-white/60">{additionalFiles[index].name}</span>}
                        </div>
                      ))}
                      <button type="button" onClick={addAdditionalSlot} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/5">+ Add attachment</button>
                    </div>
                  </section>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setOfficeView("list")} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/10">Cancel</button>
                    <button type="submit" disabled={submitting} className="rounded-full bg-orange-500 hover:bg-orange-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Saving..." : "Save"}</button>
                  </div>
                </form>
              )}

              {officeView === "list" && (
                <div className="min-w-0 overflow-hidden">
                  {loadingList ? <div className="p-12 text-center text-white/60">Loading...</div> : !selectedLocationId ? <div className="p-12 text-center text-white/60">Select a location to view the list.</div> : records.length === 0 ? <div className="p-12 text-center text-white/60">No records for this location and year. Use the Form to add one.</div> : (
                    <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                            <th className="px-6 py-4 font-semibold">Location</th>
                            <th className="px-6 py-4 font-semibold">Year</th>
                            <th className="px-6 py-4 font-semibold">Last Uploaded</th>
                            <th className="px-6 py-4 font-semibold">Office Checks</th>
                            <th className="px-6 py-4 font-semibold">Attachments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recPageItems.map((rec) => (
                            <tr key={rec._id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="px-6 py-4">{rec.locationName || "—"}</td>
                              <td className="px-6 py-4">{rec.year}</td>
                              <td className="px-6 py-4">{formatDate(rec.lastUploaded)}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {rec.officeChecks && Object.entries(rec.officeChecks).map(([k, v]) => v ? <span key={k} className="rounded bg-green-500/20 text-green-300 px-1.5 py-0.5 text-xs">{OFFICE_CHECK_LABELS[k] || k}</span> : null)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {(rec.checkboxAttachments || []).map((att) => <button key={att._id || att.key} type="button" onClick={() => handleDownload(rec._id, "checkbox", att.key)} className="text-xs text-sky-300 hover:underline">{att.fileName}</button>)}
                                  {(rec.additionalAttachments || []).map((att, i) => <button key={att._id || i} type="button" onClick={() => handleDownload(rec._id, "additional", i)} className="text-xs text-sky-300 hover:underline">{att.fileName}</button>)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <OperationsListPaginationFooter {...recFooterProps} />
                  </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
