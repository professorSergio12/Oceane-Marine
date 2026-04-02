"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useQhseRole } from "@/hooks/useQhseRole";

export default function DefectPlanPage() {
  const { contentClassName } = useQhseSidebar();
  const { canCreate, canEdit, canDelete, canApprove, canDownload, isQhseAdmin } = useQhseRole();
  const canSubmit = canCreate;
  const [form, setForm] = useState({
    equipmentDefect: "",
    base: "",
    actionRequired: "",
    targetDate: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/qhse/defects-list/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create equipment defect");
      }

      const defectId = data.data?._id || data.data?.id;
      if (defectId && selectedFiles.length > 0) {
        const fd = new FormData();
        selectedFiles.forEach((file) => fd.append("files", file));
        const upRes = await fetch(`/api/qhse/defects-list/${defectId}/upload`, {
          method: "POST",
          body: fd,
        });
        if (!upRes.ok) {
          const upData = await upRes.json();
          throw new Error(upData.error || "Failed to upload files");
        }
      }

      setMessage("Equipment defect created successfully with status OPEN!");
      setError(null);
      setSelectedFiles([]);

      // Reset form
      setForm({
        equipmentDefect: "",
        base: "",
        actionRequired: "",
        targetDate: "",
      });

      // Scroll to top to show success message
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
        <header className="mt-12 md:mt-0 mb-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="flex-shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div className="flex-1 flex flex-col items-center text-center w-full sm:w-auto">
            <p className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.25em] text-sky-300">
              QHSE / Defects List
            </p>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Create Equipment Defect</h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-025</span>
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 self-end sm:self-auto flex-wrap">
            <a
              href="/templates/controlled-register/QAF-OFD-025.xlsx"
              download
              className="inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
              title="Download form template (QAF-OFD-025)"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
              </svg>
              Template
            </a>
            <div className="inline-flex rounded-lg sm:rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/defects-list/create/plan"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Create Defect
              </Link>
              <Link
                href="/qhse/defects-list/create/list"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Defect List
              </Link>
            </div>
          </div>
        </header>

        <main>
          {!canSubmit && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
              You do not have permission to create equipment defects.
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Status: <span className="text-emerald-300">Open</span>
              </span>
            </div>

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
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? "Saving..." : "Save Defect"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

