"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useHrLoading } from "../../HrLoadingContext";

export default function OilMajorsFormPage({ onSuccess }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { setPageLoading } = useHrLoading();

  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState("Approved");
  const [attachment, setAttachment] = useState(null);
  const [existingFile, setExistingFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const statusOptions = [
    "Approved",
    "Counterparty STS service provider",
    "In Progress",
  ];

  // Load data if editing
  useEffect(() => {
    if (editId) {
      const loadData = async () => {
        try {
          setLoadingData(true);
          setPageLoading(true);
          const res = await fetch("/api/hr/oil-majors/list");
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load");
          const record = data.data?.find((r) => r._id === editId);
          if (record) {
            setCompanyName(record.companyName || "");
            setStatus(record.status || "Approved");
            setExistingFile(record.attachment || null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    setPageLoading(true);

    try {
      if (!companyName.trim()) throw new Error("Company Name is required");
      if (!status) throw new Error("Status is required");

      const formData = new FormData();
      formData.append("companyName", companyName.trim());
      formData.append("status", status);
      if (attachment) formData.append("attachment", attachment);

      const url = editId
        ? `/api/hr/oil-majors/${editId}/update`
        : "/api/hr/oil-majors/create";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || `Failed to ${editId ? "update" : "create"} record`
        );
      }

      setMessage(
        editId
          ? "Oil Major record updated successfully!"
          : "Oil Major record created successfully!"
      );

      // Reset form
      setCompanyName("");
      setStatus("Approved");
      setAttachment(null);
      setExistingFile(null);

      // Redirect after 2 seconds
      setTimeout(() => {
        if (onSuccess) onSuccess();
        router.push("/hr/oil-majors?tab=list");
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
            {editId ? "Edit Oil Major" : "Oil Major"}
          </h2>
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
          {/* Company Name */}
          <div className="space-y-2">
            <label
              htmlFor="om-company"
              className="block text-sm font-semibold text-white/90"
            >
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              id="om-company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              placeholder="e.g., CHEVRON, SHELL, BP"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label
              htmlFor="om-status"
              className="block text-sm font-semibold text-white/90"
            >
              Status <span className="text-red-400">*</span>
            </label>
            <select
              id="om-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">
              Attachment
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => setAttachment(e.target.files[0])}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
            />
            {/* Show existing file info in edit mode */}
            {editId && existingFile?.fileUrl && !attachment && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <svg
                  className="w-4 h-4 text-emerald-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-emerald-300">
                  Current file:{" "}
                  <span className="font-medium text-emerald-200">
                    {existingFile.originalFileName || "File"}
                  </span>
                  <span className="text-emerald-400/70 ml-1">
                    (Leave empty to keep existing file)
                  </span>
                </p>
              </div>
            )}
            {/* Show new file selected */}
            {attachment && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <svg
                  className="w-4 h-4 text-orange-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-orange-300">
                  New file:{" "}
                  <span className="font-medium text-orange-200">{attachment.name}</span>
                  <span className="text-orange-400/70 ml-1">
                    ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  {existingFile?.fileUrl && (
                    <span className="text-red-300/70 ml-1">
                      — will replace existing file
                    </span>
                  )}
                </p>
              </div>
            )}
            <p className="text-xs text-white/50 mt-1">
              Accepted formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || loadingData}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-orange-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? editId
                  ? "Updating..."
                  : "Creating..."
                : editId
                ? "Update Record"
                : "Create Record"}
            </button>
            <Link
              href="/hr/oil-majors?tab=list"
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
