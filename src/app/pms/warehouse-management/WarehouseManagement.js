"use client";
import { useEffect, useState } from "react";

/* =========================
   Reusable Input
========================= */
const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-200">
      {label}
    </label>
    <input
      {...props}
      className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
    />
  </div>
);

const LOCATIONS = [
  { value: "FUJAIRAH", label: "Fujairah" },
  { value: "DUBAI", label: "Dubai" },
  { value: "KHORFAKKAN", label: "Khorfakkan" },
  { value: "AJMAN", label: "Ajman" },
  { value: "PORT_KHALIFA", label: "Port-Khalifa" },
  { value: "SOHAR", label: "Sohar" },
  { value: "MUSCAT", label: "Muscat" },
  { value: "DUQM", label: "Duqm" },
  { value: "SALALAH", label: "Salalah" },
  { value: "TANJUNG_BRUAS", label: "Tanjung-Bruas" },
  { value: "MOMBASA", label: "Mombasa" },
  { value: "YEOSU", label: "Yeosu" },
];

export default function WarehouseManagement({ view: controlledView, onViewChange }) {
  const [internalView, setInternalView] = useState("form");
  const view = controlledView !== undefined ? controlledView : internalView;
  const setView = onViewChange !== undefined ? onViewChange : setInternalView;

  const [selectedLocation, setSelectedLocation] = useState("FUJAIRAH");
  const [records, setRecords] = useState([]);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString()
  );
  const [editingRecord, setEditingRecord] = useState(null);

  const [form, setForm] = useState({
    primaryFenders: "",
    secondaryFenders: "",
    hoses: "",

    ownership: "OWNED",
    status: "ACTIVE",

    equipment: "",
    nos: "",

    startDate: "",
    estimatedEndDate: "",

    fromLocation: "",
    stopover: "",
    toLocation: "",

    remarks: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const fetchList = async () => {
    const res = await fetch(
      `/api/pms/warehouse-management/list?location=${selectedLocation}&year=${filterYear}`
    );
    const data = await res.json();
    setRecords(data.data || []);
  };

  // Reset form when location changes (only if in form view)
  useEffect(() => {
    if (view === "form") {
      setForm({
        primaryFenders: "",
        secondaryFenders: "",
        hoses: "",
        ownership: "OWNED",
        status: "ACTIVE",
        equipment: "",
        nos: "",
        startDate: "",
        estimatedEndDate: "",
        fromLocation: "",
        stopover: "",
        toLocation: "",
        remarks: ""
      });
      setEditingRecord(null);
      setSuccess(null);
      setError(null);
      setAttachmentFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  useEffect(() => {
    if (view === "list") fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filterYear, selectedLocation]);

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    /* ✅ FIX #2 — FRONTEND VALIDATION */
    if (!form.equipment.trim()) {
      setError("Equipment is required");
      return;
    }

    if (!form.nos || Number(form.nos) <= 0) {
      setError("Nos must be greater than 0");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("location", selectedLocation);
      formData.append("primaryFenders", form.primaryFenders || "0");
      formData.append("secondaryFenders", form.secondaryFenders || "0");
      formData.append("hoses", form.hoses || "0");
      formData.append("ownership", form.ownership);
      formData.append("status", form.status);
      formData.append("equipment", form.equipment);
      formData.append("nos", form.nos);
      if (form.startDate) formData.append("startDate", form.startDate);
      if (form.estimatedEndDate) formData.append("estimatedEndDate", form.estimatedEndDate);
      if (form.fromLocation) formData.append("fromLocation", form.fromLocation);
      if (form.stopover) formData.append("stopover", form.stopover);
      if (form.toLocation) formData.append("toLocation", form.toLocation);
      if (form.remarks) formData.append("remarks", form.remarks);

      if (attachmentFile) {
        formData.append("attachment", attachmentFile);
      }

      const res = await fetch("/api/pms/warehouse-management/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Create failed");
      }

      setSuccess("Warehouse record saved successfully.");

      setForm({
        primaryFenders: "",
        secondaryFenders: "",
        hoses: "",
        ownership: "OWNED",
        status: "ACTIVE",
        equipment: "",
        nos: "",
        startDate: "",
        estimatedEndDate: "",
        fromLocation: "",
        stopover: "",
        toLocation: "",
        remarks: ""
      });

      setFiles([]);
      setAttachmentFile(null);
      setEditingRecord(null);

      setTimeout(() => {
        setView("list");
        setSuccess(null);
      }, 1200);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  const handleDownload = async (id, index) => {
    const url = `/api/pms/warehouse-management/${id}/download?fileIndex=${index}`;
    window.open(url, "_blank");
  };

  const handleRowClick = (record) => {
    // Format dates for input fields (YYYY-MM-DD)
    const formatDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    setEditingRecord(record._id);
    setForm({
      primaryFenders: record.primaryFenders || "",
      secondaryFenders: record.secondaryFenders || "",
      hoses: record.hoses || "",
      ownership: record.ownership || "OWNED",
      status: record.status || "ACTIVE",
      equipment: record.equipment || "",
      nos: record.nos || "",
      startDate: formatDate(record.startDate),
      estimatedEndDate: formatDate(record.estimatedEndDate),
      fromLocation: record.fromLocation || "",
      stopover: record.stopover || "",
      toLocation: record.toLocation || "",
      remarks: record.remarks || ""
    });
    setAttachmentFile(null);
    setSuccess(null);
    setError(null);
    setView("form");
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-sky-300">
            PMS / Warehouse Management
          </p>
          <h2 className="text-xl font-bold text-white">
            Warehouse Management
          </h2>
        </div>
        {/* Location Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-200">
            Select Location:
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="rounded-lg border border-white/20 bg-slate-950/40 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[180px]"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MESSAGES */}
      {success && (
        <div className="border border-emerald-400/40 bg-emerald-950/40 px-4 py-2 text-emerald-200 text-sm rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="border border-red-400/40 bg-red-950/40 px-4 py-2 text-red-200 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* FORM */}
      {view === "form" && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 p-6 space-y-6 shadow-2xl"
          style={{ backgroundColor: "#153d59" }}
        >
          <div className="grid md:grid-cols-3 gap-4">
            <Input label="Primary Fenders" name="primaryFenders" value={form.primaryFenders} onChange={handleChange} />
            <Input label="Secondary Fenders" name="secondaryFenders" value={form.secondaryFenders} onChange={handleChange} />
            <Input label="Hoses" name="hoses" value={form.hoses} onChange={handleChange} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-200">Ownership *</label>
              <select
                name="ownership"
                value={form.ownership}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-4 py-2 text-sm text-white"
                required
              >
                <option value="OWNED">Owned</option>
                <option value="THIRD_PARTY">Third Party</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-4 py-2 text-sm text-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input label="Equipment *" name="equipment" value={form.equipment} onChange={handleChange} />
            <Input label="Nos *" type="number" name="nos" value={form.nos} onChange={handleChange} />
            <Input label="Start Date" type="date" name="startDate" value={form.startDate} onChange={handleChange} />
            <Input label="Estimated End Date" type="date" name="estimatedEndDate" value={form.estimatedEndDate} onChange={handleChange} />
            <Input label="From Location" name="fromLocation" value={form.fromLocation} onChange={handleChange} />
            <Input label="Stopover" name="stopover" value={form.stopover} onChange={handleChange} />
            <Input label="To Location" name="toLocation" value={form.toLocation} onChange={handleChange} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-200">Remarks</label>
            <textarea
              name="remarks"
              rows={3}
              value={form.remarks}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-4 py-2 text-white"
            />
          </div>

          {/* File upload */}
          <div className="grid md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Attachment (optional)
              </label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  setAttachmentFile(file || null);
                }}
                className="block w-full text-xs text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-orange-600 cursor-pointer"
              />
              {attachmentFile && (
                <p className="mt-1 text-[11px] text-slate-200">
                  Selected: {attachmentFile.name}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold">
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {/* LIST */}
      {view === "list" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            <div className="grid gap-4 max-w-xs">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-2">
                  Year
                </label>
                <input
                  type="number"
                  min="2020"
                  max={new Date().getFullYear() + 5}
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-slate-950/40 px-4 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
            <table className="w-full text-sm">
              <thead className="text-slate-300 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-2">Equipment</th>
                  <th className="text-center px-4 py-2">Nos</th>
                  <th className="text-left px-4 py-2">From</th>
                  <th className="text-left px-4 py-2">To</th>
                  <th className="text-center px-4 py-2">Status</th>
                  <th className="text-center px-4 py-2">Files</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center px-4 py-4 text-slate-400">
                      No records found for {LOCATIONS.find(l => l.value === selectedLocation)?.label || selectedLocation}
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr 
                      key={r._id} 
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                      onClick={() => handleRowClick(r)}
                    >
                      <td className="px-4 py-2 text-white">{r.equipment}</td>
                      <td className="text-center px-4 py-2">{r.nos}</td>
                      <td className="px-4 py-2">{r.fromLocation || "—"}</td>
                      <td className="px-4 py-2">{r.toLocation || "—"}</td>
                    <td className="text-center px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.status === "ACTIVE" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                        }`}>
                          {r.status}
                        </span>
                    </td>
                    <td className="text-center px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      {r.attachments && r.attachments.length > 0 ? (
                        <div className="inline-flex flex-wrap gap-2 justify-center">
                          {r.attachments.map((att, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleDownload(r._id, index)}
                              className="px-3 py-1 rounded-lg border border-sky-400/50 text-[11px] text-sky-100 hover:bg-sky-500/20 transition"
                            >
                              Download {index + 1}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
