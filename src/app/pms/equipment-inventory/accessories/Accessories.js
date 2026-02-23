"use client";

import { useState, useEffect, useRef } from "react";
import AccessoriesList from "./AccessoriesList";

export default function Accessories({ view: controlledView, onViewChange }) {
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
  const [form, setForm] = useState({
    equipmentNo: "",
    equipmentName: "",
    specification: "",
    purchaseDate: "",
    remarks: "",
    quantity: "",
    putInUse: false,
    putInUseDate: "",
    placedIn: "OFFICE"
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

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

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        category,
        status: category === "OCCASIONAL" ? status : "ACTIVE",
        equipmentName: form.equipmentName.trim(),
        specification: form.specification?.trim() || undefined,
        purchaseDate: form.purchaseDate || undefined,
        remarks: form.remarks?.trim() || undefined,
        putInUse: form.putInUse || false,
        putInUseDate: form.putInUse && form.putInUseDate ? form.putInUseDate : undefined,
        placedIn: form.placedIn
      };

      if (category === "REGULAR") {
        if (!form.equipmentNo || !form.equipmentNo.trim()) {
          setError("Equipment number is required for Regular accessories");
          setSaving(false);
          return;
        }
        payload.equipmentNo = form.equipmentNo.trim();
      }

      if (category === "OCCASIONAL") {
        if (!form.quantity || Number(form.quantity) <= 0) {
          setError("Quantity is required for Occasional accessories");
          setSaving(false);
          return;
        }
        payload.quantity = Number(form.quantity);
      }

      if (!form.equipmentName.trim()) {
        setError("Equipment name is required");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/pms/equipment-inventory/accessories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Accessory saved successfully!");
        // Reset form
        setForm({
          equipmentNo: "",
          equipmentName: "",
          specification: "",
          purchaseDate: "",
          remarks: "",
          quantity: "",
          putInUse: false,
          putInUseDate: "",
          placedIn: "OFFICE"
        });
        setSelectedLocation("");
        setTimeout(() => setMessage(null), 5000);
      } else {
        setError(data.message || "Failed to save accessory");
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      setError(err.message || "An error occurred while saving. Please try again.");
      console.error("Save error:", err);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // If list view, render list component
  if (view === "list") {
    return <AccessoriesList onViewChange={setView} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white mb-1">Accessories Inventory</h2>
      </div>

      {/* Status Toggles */}
      <div className="space-y-3">
        {/* Category Toggle */}
        <div className="flex items-center gap-2">
          
          <div className="flex gap-2">
            <button
              onClick={() => setCategory("REGULAR")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                category === "REGULAR"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              Regular
            </button>
            <button
              onClick={() => setCategory("OCCASIONAL")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl space-y-6">
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
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
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
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
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
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
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
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
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
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
              />
            </div>
          </div>
        </div>

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
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
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
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {saving ? "Saving..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}
