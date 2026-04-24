"use client";

import { useState, useEffect, useRef } from "react";
import AccessoriesList from "./AccessoriesList";
import { usePmsRole } from "@/hooks/usePmsRole";

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const PMS_MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // keep under proxyClientMaxBodySize (30mb)

function pickValidPmsFile(file, setError) {
  if (!file) return null;
  if (file.size > PMS_MAX_UPLOAD_BYTES) {
    setError(
      `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed is 25 MB.`
    );
    return null;
  }
  return file;
}

const defaultFormState = () => ({
  equipmentNo: "",
  equipmentName: "",
  specification: "",
  purchaseDate: "",
  remarks: "",
  quantity: "",
  occasionalTrackTestSchedule: false,
  occasionalTestDate: "",
  occasionalNextDueDate: "",
  putInUse: false,
  putInUseDate: "",
  placedIn: "OFFICE",
});

export default function Accessories({ view: controlledView, onViewChange }) {
  const { canCreate, canEdit } = usePmsRole();
  const [editingAccessoryId, setEditingAccessoryId] = useState(null);
  const canUseForm = editingAccessoryId ? canEdit : canCreate;

  // If parent controls view, use it; otherwise use internal state
  const hasParentControl = controlledView !== undefined && onViewChange !== undefined;
  const [internalView, setInternalView] = useState("form");
  
  const view = hasParentControl ? controlledView : internalView;
  const setView = hasParentControl ? onViewChange : setInternalView;

  // Tabs
  const [category, setCategory] = useState("REGULAR");
  const [status, setStatus] = useState("ACTIVE");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locations, setLocations] = useState([]);
  const locationRef = useRef(null);

  // Form state
  const [form, setForm] = useState(defaultFormState);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [manufacturingCertificateFile, setManufacturingCertificateFile] = useState(null);
  const [testCertificateFile, setTestCertificateFile] = useState(null);
  const [existingManufacturingCert, setExistingManufacturingCert] = useState(null);
  const [existingTestCert, setExistingTestCert] = useState(null);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/master/locations/list");
        const data = await res.json();
        if (data.locations) {
          setLocations(data.locations);
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    fetchLocations();
  }, []);

  // Handle click outside location dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) {
        setShowLocationDropdown(false);
      }
    };
    if (showLocationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLocationDropdown]);

  // Get current date for "Last updated"
  const getLastUpdatedDate = () => {
    const today = new Date();
    return today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const resetAccessoryForm = () => {
    setEditingAccessoryId(null);
    setCategory("REGULAR");
    setStatus("ACTIVE");
    setForm(defaultFormState());
    setManufacturingCertificateFile(null);
    setTestCertificateFile(null);
    setExistingManufacturingCert(null);
    setExistingTestCert(null);
    const manufacturingInput = document.querySelector(
      'input[type="file"][name="manufacturingCertificate"]'
    );
    const testInput = document.querySelector('input[type="file"][name="testCertificate"]');
    if (manufacturingInput) manufacturingInput.value = "";
    if (testInput) testInput.value = "";
  };

  const startEditFromItem = (item) => {
    if (!item?._id || !canEdit) return;
    setEditingAccessoryId(item._id);
    setCategory(item.category);
    setStatus(item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setForm({
      equipmentNo: item.equipmentNo || "",
      equipmentName: item.equipmentName || "",
      specification: item.specification || "",
      purchaseDate: toDateInputValue(item.purchaseDate),
      remarks: item.remarks || "",
      quantity: item.quantity != null && item.quantity !== "" ? String(item.quantity) : "",
      occasionalTrackTestSchedule: !!item.occasionalTrackTestSchedule,
      occasionalTestDate: toDateInputValue(item.occasionalTestDate),
      occasionalNextDueDate: toDateInputValue(item.occasionalNextDueDate),
      putInUse: !!item.putInUse,
      putInUseDate: toDateInputValue(item.putInUseDate),
      placedIn: item.placedIn || "OFFICE",
    });
    setManufacturingCertificateFile(null);
    setTestCertificateFile(null);
    setExistingManufacturingCert(
      item.manufacturingCertificate?.fileUrl
        ? {
            fileUrl: item.manufacturingCertificate.fileUrl,
            originalFileName:
              item.manufacturingCertificate.originalFileName || "",
          }
        : null
    );
    setExistingTestCert(
      item.testCertificate?.fileUrl
        ? {
            fileUrl: item.testCertificate.fileUrl,
            originalFileName: item.testCertificate.originalFileName || "",
          }
        : null
    );
    const manufacturingInput = document.querySelector(
      'input[type="file"][name="manufacturingCertificate"]'
    );
    const testInput = document.querySelector('input[type="file"][name="testCertificate"]');
    if (manufacturingInput) manufacturingInput.value = "";
    if (testInput) testInput.value = "";
    setMessage(null);
    setError(null);
    setView("form");
  };

  // Handle save
  const handleSave = async () => {
    if (!canUseForm) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      if (category === "REGULAR") {
        if (!form.equipmentNo || !form.equipmentNo.trim()) {
          setError("Equipment number is required for Regular accessories");
          setSaving(false);
          return;
        }
      }

      if (category === "OCCASIONAL") {
        if (!form.quantity || Number(form.quantity) <= 0) {
          setError("Quantity is required for Occasional accessories");
          setSaving(false);
          return;
        }
        if (form.occasionalTrackTestSchedule) {
          if (!form.occasionalTestDate || !form.occasionalNextDueDate) {
            setError(
              "When test schedule is enabled, both test date and next due date are required"
            );
            setSaving(false);
            return;
          }
        }
      }

      if (!form.equipmentName.trim()) {
        setError("Equipment name is required");
        setSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append("category", category);
      formData.append("status", category === "OCCASIONAL" ? status : "ACTIVE");
      formData.append("equipmentName", form.equipmentName.trim());
      formData.append("specification", form.specification?.trim() || "");
      if (form.purchaseDate) formData.append("purchaseDate", form.purchaseDate);
      formData.append("remarks", form.remarks?.trim() || "");
      formData.append("putInUse", form.putInUse ? "true" : "false");
      if (form.putInUse && form.putInUseDate) formData.append("putInUseDate", form.putInUseDate);
      formData.append("placedIn", form.placedIn);

      if (category === "REGULAR") {
        formData.append("equipmentNo", form.equipmentNo.trim());
      }

      if (category === "OCCASIONAL") {
        formData.append("quantity", form.quantity);
        formData.append(
          "occasionalTrackTestSchedule",
          form.occasionalTrackTestSchedule ? "true" : "false"
        );
        if (form.occasionalTrackTestSchedule) {
          formData.append("occasionalTestDate", form.occasionalTestDate);
          formData.append("occasionalNextDueDate", form.occasionalNextDueDate);
        }
      }

      // Add certificate files if selected
      if (manufacturingCertificateFile) {
        formData.append("manufacturingCertificate", manufacturingCertificateFile);
      }
      if (testCertificateFile) {
        formData.append("testCertificate", testCertificateFile);
      }

      const url = editingAccessoryId
        ? `/api/pms/equipment-inventory/accessories/${editingAccessoryId}`
        : "/api/pms/equipment-inventory/accessories/create";
      const method = editingAccessoryId ? "PATCH" : "POST";

      let res;
      try {
        res = await fetch(url, {
          method,
          body: formData,
        });
      } catch (networkErr) {
        throw new Error(
          `Upload request failed before the server responded${
            networkErr?.message ? `: ${networkErr.message}` : ""
          }. If a file was attached, try a smaller file or retry.`
        );
      }

      const rawText = await res.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { message: rawText?.slice(0, 300) };
      }

      if (res.ok) {
        setMessage(
          data.message ||
            (editingAccessoryId ? "Accessory updated successfully!" : "Accessory saved successfully!")
        );
        resetAccessoryForm();
        setSelectedLocation("");
        setTimeout(() => setMessage(null), 5000);
      } else {
        setError(
          data.message || `Failed to save accessory (status ${res.status})`
        );
        setTimeout(() => setError(null), 8000);
      }
    } catch (err) {
      setError(err.message || "An error occurred while saving. Please try again.");
      console.error("Save error:", err);
      setTimeout(() => setError(null), 8000);
    } finally {
      setSaving(false);
    }
  };

  // If list view, render list component
  if (view === "list") {
    return <AccessoriesList onEditItem={startEditFromItem} />;
  }

  let saveButtonText = "SAVE";
  if (saving) saveButtonText = "Saving...";
  else if (editingAccessoryId) saveButtonText = "Save changes";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Accessories Inventory</h2>
      </div>

      {/* Status Toggles */}
      <div className="space-y-3">
        {/* Category Toggle */}
        <div className="flex items-center gap-2">
          
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!!editingAccessoryId}
              onClick={() => {
                setCategory("REGULAR");
                setForm((f) => ({
                  ...f,
                  occasionalTrackTestSchedule: false,
                  occasionalTestDate: "",
                  occasionalNextDueDate: "",
                }));
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                category === "REGULAR"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              Regular
            </button>
            <button
              type="button"
              disabled={!!editingAccessoryId}
              onClick={() => setCategory("OCCASIONAL")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                category === "OCCASIONAL"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              Occasional
            </button>
          </div>
        </div>

        {/* Status Toggle - Only for Occasional */}
        {category === "OCCASIONAL" && (
          <div className="flex items-center gap-2 justify-end">
           
            <div className="flex gap-2">
              <button
                onClick={() => setStatus("ACTIVE")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  status === "ACTIVE"
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/40"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatus("INACTIVE")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  status === "INACTIVE"
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/40"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-950/40 border border-green-500/40 rounded-xl px-4 py-3 text-green-200 text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Form Section */}
      <div className="rounded-3xl border border-white/10 bg-[#0b2740]/85 backdrop-blur-[2px] p-4 sm:p-6 shadow-2xl space-y-6 max-w-6xl mx-auto">
        {!canUseForm && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
            You do not have permission to create or edit accessories records.
          </div>
        )}
        {editingAccessoryId && canEdit && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-100">Editing an existing accessory.</p>
            <button
              type="button"
              onClick={resetAccessoryForm}
              className="text-xs px-3 py-1.5 rounded-lg border border-amber-400/50 text-amber-200 hover:bg-amber-500/15"
            >
              Cancel edit
            </button>
          </div>
        )}
        <fieldset
          disabled={!canUseForm}
          className="border-0 p-0 m-0 min-w-0 space-y-6 disabled:opacity-[0.88]"
        >
        <div className="grid gap-6 md:grid-cols-2">
          {/* Equipment No - Only for Regular */}
          {category === "REGULAR" && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/90">
                Equipment No:
              </label>
              <input
                type="text"
                value={form.equipmentNo}
                onChange={(e) => setForm({ ...form, equipmentNo: e.target.value })}
                placeholder="Enter equipment number"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
              />
            </div>
          )}

          {/* Quantity - Only for Occasional */}
          {category === "OCCASIONAL" && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/90">
                Quantity:
              </label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="Enter quantity"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
              />
            </div>
          )}

          {/* Equipment Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              Equipment name:
            </label>
            <input
              type="text"
              value={form.equipmentName}
              onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
              placeholder="Enter equipment name"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
            />
          </div>

          {/* Specification */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              Specification:
            </label>
            <input
              type="text"
              value={form.specification}
              onChange={(e) => setForm({ ...form, specification: e.target.value })}
              placeholder="Enter specification"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition"
            />
          </div>

          {/* Date of Purchase */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              Date of purchase:
            </label>
            <div className="relative">
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
              />
            </div>
          </div>
        </div>

        {/* Occasional: optional test schedule */}
        {category === "OCCASIONAL" && (
          <div className="rounded-2xl border border-orange-400/35 bg-orange-500/10 p-4 sm:p-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white">
                Test schedule (optional)
              </h4>
              <p className="text-xs text-white/60 mt-1">
                Only some occasional items need this. Turn on to capture{" "}
                <strong className="text-white/80">test date</strong> and{" "}
                <strong className="text-white/80">next due</strong>.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.occasionalTrackTestSchedule}
                onChange={(e) =>
                  setForm({
                    ...form,
                    occasionalTrackTestSchedule: e.target.checked,
                    ...(!e.target.checked
                      ? { occasionalTestDate: "", occasionalNextDueDate: "" }
                      : {}),
                  })
                }
                className="h-5 w-5 rounded border-white/50 bg-transparent text-orange-400 focus:ring-orange-400 cursor-pointer"
              />
              <span className="text-sm font-semibold text-white/90">
                Track test date and next due
              </span>
            </label>
            {form.occasionalTrackTestSchedule && (
              <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-white/10">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Test date
                  </label>
                  <input
                    type="date"
                    value={form.occasionalTestDate}
                    onChange={(e) =>
                      setForm({ ...form, occasionalTestDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Next due
                  </label>
                  <input
                    type="date"
                    value={form.occasionalNextDueDate}
                    onChange={(e) =>
                      setForm({ ...form, occasionalNextDueDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Put in Use */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="putInUse"
              checked={form.putInUse}
              onChange={(e) => setForm({ ...form, putInUse: e.target.checked })}
              className="h-5 w-5 rounded border-white/50 bg-transparent text-orange-400 focus:ring-orange-400 cursor-pointer"
            />
            <label htmlFor="putInUse" className="text-sm font-semibold text-white/90 cursor-pointer">
              Put in use:
            </label>
          </div>
          
          {form.putInUse && (
            <div className="ml-8 space-y-2">
              <label className="block text-sm font-semibold text-white/90">
                Date:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={form.putInUseDate}
                  onChange={(e) => setForm({ ...form, putInUseDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Placed In */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/90">
            Placed in:
          </label>
          <div className="flex gap-4">
            {["OFFICE", "BAY", "BASE"].map((loc) => (
              <label key={loc} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="placedIn"
                  value={loc}
                  checked={form.placedIn === loc}
                  onChange={(e) => setForm({ ...form, placedIn: e.target.value })}
                  className="h-5 w-5 rounded-full border-white/50 bg-transparent text-orange-400 focus:ring-orange-400 cursor-pointer"
                />
                <span className="text-sm text-white/90">{loc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Certificates */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              Manufacturing Certificate:
            </label>
            {existingManufacturingCert?.fileUrl &&
              !manufacturingCertificateFile && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-300 shrink-0">
                    Current
                  </span>
                  <a
                    href={existingManufacturingCert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-xs text-emerald-200 hover:text-emerald-100 underline"
                    title={
                      existingManufacturingCert.originalFileName ||
                      existingManufacturingCert.fileUrl
                    }
                  >
                    {existingManufacturingCert.originalFileName ||
                      existingManufacturingCert.fileUrl.split("/").pop()}
                  </a>
                  <a
                    href={existingManufacturingCert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-sky-300 hover:text-sky-200 underline shrink-0"
                  >
                    View / Download
                  </a>
                </div>
              )}
            <input
              type="file"
              name="manufacturingCertificate"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const picked = e.target.files?.[0] || null;
                const valid = pickValidPmsFile(picked, setError);
                if (picked && !valid) e.target.value = "";
                setManufacturingCertificateFile(valid);
                if (valid) setError(null);
              }}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
            />
            {existingManufacturingCert?.fileUrl && (
              <p className="text-[10px] text-slate-400">
                {manufacturingCertificateFile
                  ? "New upload will replace the current certificate on save."
                  : "Leave empty to keep the current certificate."}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              Test Certificate:
            </label>
            {existingTestCert?.fileUrl && !testCertificateFile && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <span className="text-[11px] uppercase tracking-wider text-emerald-300 shrink-0">
                  Current
                </span>
                <a
                  href={existingTestCert.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-xs text-emerald-200 hover:text-emerald-100 underline"
                  title={
                    existingTestCert.originalFileName ||
                    existingTestCert.fileUrl
                  }
                >
                  {existingTestCert.originalFileName ||
                    existingTestCert.fileUrl.split("/").pop()}
                </a>
                <a
                  href={existingTestCert.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-semibold text-sky-300 hover:text-sky-200 underline shrink-0"
                >
                  View / Download
                </a>
              </div>
            )}
            <input
              type="file"
              name="testCertificate"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const picked = e.target.files?.[0] || null;
                const valid = pickValidPmsFile(picked, setError);
                if (picked && !valid) e.target.value = "";
                setTestCertificateFile(valid);
                if (valid) setError(null);
              }}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
            />
            {existingTestCert?.fileUrl && (
              <p className="text-[10px] text-slate-400">
                {testCertificateFile
                  ? "New upload will replace the current certificate on save."
                  : "Leave empty to keep the current certificate."}
              </p>
            )}
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white/90">
            Remarks:
          </label>
          <textarea
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="Enter remarks..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canUseForm || saving}
            className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {saveButtonText}
          </button>
        </div>
        </fieldset>
      </div>
    </div>
  );
}
