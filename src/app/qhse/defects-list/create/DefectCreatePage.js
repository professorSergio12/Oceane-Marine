"use client";

import { useQhseSidebar } from "../../QhseSidebarContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TemplateDownloadLink } from "../../components/TemplateDownloadLink";
import { useSearchParams } from "next/navigation";

export default function DefectCreatePage() {
  const { contentClassName } = useQhseSidebar();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");

  const [form, setForm] = useState({
    equipmentDefect: "",
    base: "",
    actionRequired: "",
    targetDate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [displayFormCode, setDisplayFormCode] = useState(null);
  const [displaySerialNumber, setDisplaySerialNumber] = useState(null);

  useEffect(() => {
    fetch("/api/master/locations/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.locations && Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/qhse/defects-list/${editId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !data.data) return;
        const d = data.data;
        setForm({
          equipmentDefect: d.equipmentDefect || "",
          base: d.base || "",
          actionRequired: d.actionRequired || "",
          targetDate: d.targetDate
            ? new Date(d.targetDate).toISOString().slice(0, 10)
            : "",
        });
        setExistingAttachments(d.attachments || []);
        setDisplayFormCode(d.formCode || null);
        setDisplaySerialNumber(d.serialNumber || null);
      })
      .catch(() => setError("Failed to load defect"))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [editId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadFiles = async (defectId) => {
    if (!selectedFiles.length) return;
    const fd = new FormData();
    selectedFiles.forEach((file) => fd.append("files", file));
    const res = await fetch(`/api/qhse/defects-list/${defectId}/upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to upload files");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const url = editId
        ? `/api/qhse/defects-list/${editId}/update`
        : "/api/qhse/defects-list/create";
      const method = editId ? "PUT" : "POST";
      const body = editId
        ? JSON.stringify({
            equipmentDefect: form.equipmentDefect,
            base: form.base,
            actionRequired: form.actionRequired,
            targetDate: form.targetDate,
          })
        : JSON.stringify(form);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (editId ? "Failed to update defect" : "Failed to create equipment defect"));
      }

      const defectId = data.data?._id || data.data?.id || editId;
      if (defectId && selectedFiles.length > 0) {
        await uploadFiles(defectId);
      }

      if (data.data?.formCode) setDisplayFormCode(data.data.formCode);
      if (data.data?.serialNumber) setDisplaySerialNumber(data.data.serialNumber);
      setMessage(editId ? "Defect updated successfully!" : "Equipment defect created successfully with status OPEN!");
      setError(null);
      setSelectedFiles([]);
      if (editId) setExistingAttachments((prev) => prev || []);

      if (!editId) {
        setForm({
          equipmentDefect: "",
          base: "",
          actionRequired: "",
          targetDate: "",
        });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Something went wrong");
      setMessage(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        <header className="mt-12 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
                QHSE / Defects List
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {editId ? "Edit Equipment Defect" : "Create Equipment Defect"}
              </h1>
              <p className="text-sm text-slate-200 mt-1">
                Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-025</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TemplateDownloadLink formCode="QAF-OFD-025" />
          <Link
            href="/qhse/defects-list/create/list"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
          >
            View Defects List
          </Link>
          </div>
        </header>

        <main>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl space-y-6">
            {loading ? (
              <p className="text-sm text-slate-300">Loading defect...</p>
            ) : (
              <>
            {!editId && (
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Status: <span className="text-emerald-300">Open</span>
              </span>
            </div>
            )}

            {(displayFormCode || displaySerialNumber) && (
              <div className="flex flex-wrap items-center gap-6 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
                {displayFormCode && (
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-xs">Form Code</span>
                    <p className="font-mono font-semibold text-sky-300">{displayFormCode}</p>
                  </div>
                )}
                {displaySerialNumber && (
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-xs">Serial</span>
                    <p className="font-mono font-semibold text-slate-200">{displaySerialNumber}</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Equipment Defect */}
              <div>
                <label
                  htmlFor="equipmentDefect"
                  className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5"
                >
                  Equipment Defect
                </label>
                <textarea
                  id="equipmentDefect"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  rows={3}
                  value={form.equipmentDefect}
                  onChange={(e) =>
                    handleChange("equipmentDefect", e.target.value)
                  }
                  placeholder="Describe the equipment defect"
                  required
                />
              </div>

              {/* Base + Target Date */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="base"
                    className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5"
                  >
                    Base
                  </label>
                  <select
                    id="base"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    value={form.base}
                    onChange={(e) => handleChange("base", e.target.value)}
                    required
                  >
                    <option value="">Select base / location</option>
                    {form.base && !locations.some((l) => l.name === form.base) && (
                      <option value={form.base}>{form.base}</option>
                    )}
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="targetDate"
                    className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5"
                  >
                    Target Date
                  </label>
                  <input
                    id="targetDate"
                    type="date"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    value={form.targetDate}
                    onChange={(e) =>
                      handleChange("targetDate", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              {/* Photos / Files */}
              <div>
                <label
                  htmlFor="files"
                  className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5"
                >
                  Photos / Files (optional)
                </label>
                <input
                  id="files"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white file:mr-3 file:py-1.5 file:rounded-full file:border-0 file:bg-sky-500/20 file:text-sky-200 file:text-xs"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />
                {selectedFiles.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedFiles.length} file(s) selected
                  </p>
                )}
                {editId && existingAttachments?.length > 0 && (
                  <p className="text-xs text-sky-300 mt-1">
                    {existingAttachments.length} file(s) already attached. Add more above.
                  </p>
                )}
              </div>

              {/* Action Required */}
              <div>
                <label
                  htmlFor="actionRequired"
                  className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5"
                >
                  Action Required
                </label>
                <textarea
                  id="actionRequired"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  rows={3}
                  value={form.actionRequired}
                  onChange={(e) =>
                    handleChange("actionRequired", e.target.value)
                  }
                  placeholder="Describe the corrective action required"
                  required
                />
              </div>

              {/* Messages */}
              {error && (
                <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              {message && (
                <div className="text-base text-emerald-300 bg-emerald-950/40 border-2 border-emerald-500/60 rounded-lg px-6 py-4 shadow-lg shadow-emerald-500/20">
                  <span className="font-semibold">{message}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      equipmentDefect: "",
                      base: "",
                      actionRequired: "",
                      targetDate: "",
                    })
                  }
                  className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                  disabled={submitting}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full bg-orange-500 hover:bg-orange-400 px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] shadow disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editId ? "Update Defect" : "Save Defect"}
                </button>
              </div>
            </form>
            </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

