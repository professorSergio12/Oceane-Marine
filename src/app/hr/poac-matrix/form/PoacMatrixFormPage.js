"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useHrLoading } from "../../HrLoadingContext";

export default function PoacMatrixFormPage({ onSuccess }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { setPageLoading } = useHrLoading();

  const [rows, setRows] = useState([
    {
      stsServiceProvider: "",
      poacName: "",
      validPassport: "No",
      validMastersCOC: "No",
      dangerousCargoEndorsementOil: "No",
      dangerousCargoEndorsementChem: "No",
      dangerousCargoEndorsementGas: "No",
      oilSpillResponseTraining: "No",
      stsSimulatorTraining: "No",
      vesselSizeLimitations: "No",
      underwayOperations: "No",
      validMedicals: "No",
      experienceWithOceane: "",
      remarks: "",
      attachment: null,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // Store existing file info per row index for edit mode
  const [existingFiles, setExistingFiles] = useState([]);

  // Load data if editing
  useEffect(() => {
    if (editId) {
      const loadData = async () => {
        try {
          setLoadingData(true);
          setPageLoading(true);
          const res = await fetch(`/api/hr/poac-matrix/list`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load");
          const record = data.data?.find((r) => r._id === editId);
          if (record && record.rows && record.rows.length > 0) {
            // Load all rows from the record
            const loadedRows = record.rows.map((row) => ({
              stsServiceProvider: row.stsServiceProvider || "",
              poacName: row.poacName || "",
              validPassport: row.validPassport || "No",
              validMastersCOC: row.validMastersCOC || "No",
              dangerousCargoEndorsementOil: row.dangerousCargoEndorsementOil || "No",
              dangerousCargoEndorsementChem: row.dangerousCargoEndorsementChem || "No",
              dangerousCargoEndorsementGas: row.dangerousCargoEndorsementGas || "No",
              oilSpillResponseTraining: row.oilSpillResponseTraining || "No",
              stsSimulatorTraining: row.stsSimulatorTraining || "No",
              vesselSizeLimitations: row.vesselSizeLimitations || "No",
              underwayOperations: row.underwayOperations || "No",
              validMedicals: row.validMedicals || "No",
              experienceWithOceane: row.experienceWithOceane || "",
              remarks: row.remarks || "",
              attachment: null, // null = no new file selected yet
            }));
            setRows(loadedRows);

            // Store existing file info for each row
            const files = record.rows.map((row) => row.attachment || null);
            setExistingFiles(files);
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoadingData(false);
          setPageLoading(false);
        }
      };
      loadData();
    }
  }, [editId, setPageLoading]);

  const addRow = () => {
    // Pre-fill STS Service Provider from the first row (usually same for all rows)
    const firstProvider = rows.length > 0 ? rows[0].stsServiceProvider : "";
    setRows([
      ...rows,
      {
        stsServiceProvider: firstProvider,
        poacName: "",
        validPassport: "No",
        validMastersCOC: "No",
        dangerousCargoEndorsementOil: "No",
        dangerousCargoEndorsementChem: "No",
        dangerousCargoEndorsementGas: "No",
        oilSpillResponseTraining: "No",
        stsSimulatorTraining: "No",
        vesselSizeLimitations: "No",
        underwayOperations: "No",
        validMedicals: "No",
        experienceWithOceane: "",
        remarks: "",
        attachment: null,
      },
    ]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    setPageLoading(true);

    try {
      // Validate all rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        if (!row.stsServiceProvider || !row.stsServiceProvider.trim()) {
          throw new Error(`Row ${i + 1}: STS Service Provider is required`);
        }
        if (!row.poacName || !row.poacName.trim()) {
          throw new Error(`Row ${i + 1}: POAC's Name is required`);
        }
        if (!row.experienceWithOceane || !row.experienceWithOceane.trim()) {
          throw new Error(`Row ${i + 1}: Experience with Oceane is required`);
        }
      }

      // Create FormData with all rows
      const formData = new FormData();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        formData.append(`row_${i}_stsServiceProvider`, (row.stsServiceProvider || "").trim());
        formData.append(`row_${i}_poacName`, (row.poacName || "").trim());
        formData.append(`row_${i}_validPassport`, row.validPassport || "No");
        formData.append(`row_${i}_validMastersCOC`, row.validMastersCOC || "No");
        formData.append(`row_${i}_dangerousCargoEndorsementOil`, row.dangerousCargoEndorsementOil || "No");
        formData.append(`row_${i}_dangerousCargoEndorsementChem`, row.dangerousCargoEndorsementChem || "No");
        formData.append(`row_${i}_dangerousCargoEndorsementGas`, row.dangerousCargoEndorsementGas || "No");
        formData.append(`row_${i}_oilSpillResponseTraining`, row.oilSpillResponseTraining || "No");
        formData.append(`row_${i}_stsSimulatorTraining`, row.stsSimulatorTraining || "No");
        formData.append(`row_${i}_vesselSizeLimitations`, row.vesselSizeLimitations || "No");
        formData.append(`row_${i}_underwayOperations`, row.underwayOperations || "No");
        formData.append(`row_${i}_validMedicals`, row.validMedicals || "No");
        formData.append(`row_${i}_experienceWithOceane`, (row.experienceWithOceane || "").trim());
        formData.append(`row_${i}_remarks`, (row.remarks || "").trim());
        if (row.attachment) formData.append(`row_${i}_attachment`, row.attachment);
      }

      const url = editId
        ? `/api/hr/poac-matrix/${editId}/update`
        : "/api/hr/poac-matrix/create";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || `Failed to ${editId ? "update" : "create"} record`);
      }

      setMessage(editId ? "POAC Matrix record updated successfully!" : "POAC Matrix records created successfully!");

      // Reset form
      setRows([
        {
          stsServiceProvider: "",
          poacName: "",
          validPassport: "No",
          validMastersCOC: "No",
          dangerousCargoEndorsementOil: "No",
          dangerousCargoEndorsementChem: "No",
          dangerousCargoEndorsementGas: "No",
          oilSpillResponseTraining: "No",
          stsSimulatorTraining: "No",
          vesselSizeLimitations: "No",
          underwayOperations: "No",
          validMedicals: "No",
          experienceWithOceane: "",
          remarks: "",
          attachment: null,
        },
      ]);
      setExistingFiles([]);

      // Redirect after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
        router.push("/hr/poac-matrix?tab=list");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {editId ? "Edit POAC Matrix" : "POAC Matrix"}
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200"
          >
            + Add Row
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="border border-white/10 rounded-xl p-6 space-y-4 bg-white/5">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">
                  Row {rowIndex + 1}
                </h3>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* STS Service Provider */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    STS Service Provider <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={row.stsServiceProvider}
                    onChange={(e) => updateRow(rowIndex, "stsServiceProvider", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder="Enter STS Service Provider"
                  />
                </div>

                {/* POAC's Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    POAC's Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={row.poacName}
                    onChange={(e) => updateRow(rowIndex, "poacName", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder="Enter POAC's Name"
                  />
                </div>

                {/* Valid Passport */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Valid Passport <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={row.validPassport}
                    onChange={(e) => updateRow(rowIndex, "validPassport", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Valid Master's COC */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Valid Master's COC <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={row.validMastersCOC}
                    onChange={(e) => updateRow(rowIndex, "validMastersCOC", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Dangerous cargo endorsement (Oil) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Dangerous cargo endorsement (Oil)
                  </label>
                  <select
                    value={row.dangerousCargoEndorsementOil}
                    onChange={(e) => updateRow(rowIndex, "dangerousCargoEndorsementOil", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Dangerous cargo endorsement (Chem) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Dangerous cargo endorsement (Chem)
                  </label>
                  <select
                    value={row.dangerousCargoEndorsementChem}
                    onChange={(e) => updateRow(rowIndex, "dangerousCargoEndorsementChem", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Dangerous cargo endorsements (Gas) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Dangerous cargo endorsements (Gas)
                  </label>
                  <select
                    value={row.dangerousCargoEndorsementGas}
                    onChange={(e) => updateRow(rowIndex, "dangerousCargoEndorsementGas", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Oil spill response training */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Oil spill response training
                  </label>
                  <select
                    value={row.oilSpillResponseTraining}
                    onChange={(e) => updateRow(rowIndex, "oilSpillResponseTraining", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* STS Simulator training */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    STS Simulator training
                  </label>
                  <select
                    value={row.stsSimulatorTraining}
                    onChange={(e) => updateRow(rowIndex, "stsSimulatorTraining", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Vessel Size Limitations */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Vessel Size Limitations
                  </label>
                  <select
                    value={row.vesselSizeLimitations}
                    onChange={(e) => updateRow(rowIndex, "vesselSizeLimitations", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Underway operations */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Underway operations
                  </label>
                  <select
                    value={row.underwayOperations}
                    onChange={(e) => updateRow(rowIndex, "underwayOperations", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Valid Medicals */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Valid Medicals
                  </label>
                  <select
                    value={row.validMedicals}
                    onChange={(e) => updateRow(rowIndex, "validMedicals", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  >
                    <option value="Yes" className="bg-slate-900">Yes</option>
                    <option value="No" className="bg-slate-900">No</option>
                  </select>
                </div>

                {/* Experience with Oceane */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Experience with Oceane <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={row.experienceWithOceane}
                    onChange={(e) => updateRow(rowIndex, "experienceWithOceane", e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder="e.g., > 1year, < 1 year"
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Remarks: Locations / etc
                  </label>
                  <textarea
                    value={row.remarks}
                    onChange={(e) => updateRow(rowIndex, "remarks", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    placeholder="Enter remarks, locations, etc."
                  />
                </div>

                {/* Attachment */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-white/90">
                    Attachment {!editId && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => updateRow(rowIndex, "attachment", e.target.files[0])}
                    required={!editId && !existingFiles[rowIndex]?.fileUrl}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  />
                  {/* Show existing file info in edit mode when no new file is selected */}
                  {editId && existingFiles[rowIndex]?.fileUrl && !row.attachment && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-emerald-300">
                        Current file: <span className="font-medium text-emerald-200">{existingFiles[rowIndex].originalFileName || "File"}</span>
                        <span className="text-emerald-400/70 ml-1">(Leave empty to keep existing file)</span>
                      </p>
                    </div>
                  )}
                  {/* Show new file selected */}
                  {row.attachment && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-orange-300">
                        New file: <span className="font-medium text-orange-200">{row.attachment.name}</span>
                        <span className="text-orange-400/70 ml-1">({(row.attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                        {existingFiles[rowIndex]?.fileUrl && (
                          <span className="text-red-300/70 ml-1">— will replace existing file</span>
                        )}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-white/50 mt-1">
                    Accepted formats: PDF, DOC, DOCX, XLS, XLSX
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || loadingData}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-orange-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (editId ? "Updating..." : "Creating...") : (editId ? "Update Record" : "Create Records")}
            </button>
            <Link
              href="/hr/poac-matrix?tab=list"
              className="px-6 py-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-semibold transition duration-200"
            >
              Cancel
            </Link>
          </div>

          {loadingData && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              <p className="text-white/60 text-sm mt-2">Loading record data...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
