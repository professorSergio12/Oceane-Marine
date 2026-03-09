"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

/* ── Shared icon button components (matching QHSE style) ── */
const tooltipClass =
  "pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs font-medium text-white bg-slate-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap";
const iconClass = "w-5 h-5";

function ViewIconButton({ onClick, title = "View" }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-1.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 transition inline-flex"
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      <span className={tooltipClass}>{title}</span>
    </span>
  );
}

function EditIconButton({ onClick, title = "Edit" }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="p-1.5 rounded text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition inline-flex"
      >
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <span className={tooltipClass}>{title}</span>
    </span>
  );
}

function DownloadIconButton({ onClick, disabled, loading }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Download"
        aria-label="Download"
        className="p-1.5 rounded text-sky-400 hover:text-sky-300 hover:bg-white/10 disabled:opacity-50 transition inline-flex"
      >
        {loading ? (
          <svg className={`${iconClass} animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </button>
      <span className={tooltipClass}>Download</span>
    </span>
  );
}

function DeleteIconButton({ onClick, disabled, loading }) {
  return (
    <span className="relative group inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Delete"
        aria-label="Delete"
        className="p-1.5 rounded text-red-300 hover:text-red-200 hover:bg-red-500/10 disabled:opacity-50 transition inline-flex"
      >
        {loading ? (
          <svg className={`${iconClass} animate-spin`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
      <span className={tooltipClass}>Delete</span>
    </span>
  );
}

/* ── Main list component ── */
export default function StatutoryCertificatesListPage({ onRefresh }) {
  const router = useRouter();
  const [certificates, setCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Filters
  const [filterYear, setFilterYear] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Unique values for filters
  const years = [...new Set(certificates.map((c) => c.year))].sort((a, b) => String(b).localeCompare(String(a)));
  const locations = [...new Set(certificates.map((c) => c.location))].sort();

  useEffect(() => {
    fetchCertificates();
  }, []);

  useEffect(() => {
    let filtered = certificates;
    if (filterYear) filtered = filtered.filter((c) => c.year === filterYear);
    if (filterLocation) filtered = filtered.filter((c) => c.location === filterLocation);
    setFilteredCertificates(filtered);
  }, [certificates, filterYear, filterLocation]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/hr/statutory-certificates/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to fetch certificates");
      setCertificates(data.data || []);
      setFilteredCertificates(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (cert) => setSelectedItem(cert);
  const closeModal = () => setSelectedItem(null);

  const handleEdit = (cert) => {
    router.push(`/hr/statutory-certificates?tab=form&edit=${cert._id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this certificate? This action cannot be undone.")) return;
    try {
      setDeletingId(id);
      setError("");
      setActionMessage("");
      const res = await fetch(`/api/hr/statutory-certificates/${id}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to delete");
      setActionMessage("Certificate deleted successfully.");
      setCertificates((prev) => prev.filter((c) => c._id !== id));
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (cert) => {
    if (!cert.attachment?.fileUrl) return;
    setDownloadingId(cert._id);
    const link = document.createElement("a");
    link.href = cert.attachment.fileUrl;
    link.download = cert.attachment.originalFileName || "certificate";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingId(null), 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Filters Row */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
            <select
              className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Location</span>
            <select
              className="theme-select rounded-full px-3 py-1 text-xs tracking-widest uppercase"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          {(filterYear || filterLocation) && (
            <button
              onClick={() => { setFilterYear(""); setFilterLocation(""); }}
              className="text-xs text-slate-400 hover:text-white transition underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-200 text-sm font-medium">
            {actionMessage}
          </div>
        )}

        {/* Table */}
        <main>
          {filteredCertificates.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
              <p className="text-white/60 mb-2">
                {certificates.length === 0 ? "No certificates found" : "No certificates match the selected filters"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 font-semibold">Location</th>
                      <th className="px-6 py-4 font-semibold">Type of Document</th>
                      <th className="px-6 py-4 font-semibold">Year</th>
                      <th className="px-6 py-4 font-semibold">Validity</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertificates.map((cert) => (
                      <tr key={cert._id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-medium text-white">{cert.location}</td>
                        <td className="px-6 py-4 text-slate-200">{cert.typeOfDocs}</td>
                        <td className="px-6 py-4 font-mono text-sky-300">{cert.year}</td>
                        <td className="px-6 py-4 text-slate-200">
                          {cert.validity ? new Date(cert.validity).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ViewIconButton onClick={() => handleView(cert)} />
                            <EditIconButton onClick={() => handleEdit(cert)} />
                            <DownloadIconButton
                              onClick={() => handleDownload(cert)}
                              disabled={!cert.attachment?.fileUrl || downloadingId === cert._id}
                              loading={downloadingId === cert._id}
                            />
                            <DeleteIconButton
                              onClick={() => handleDelete(cert._id)}
                              disabled={deletingId === cert._id}
                              loading={deletingId === cert._id}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* View Modal */}
      {selectedItem &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              className="relative bg-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 px-6 py-5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Certificate Details</h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Location</label>
                    <p className="text-white font-medium">{selectedItem.location}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Type of Document</label>
                    <p className="text-white font-medium">{selectedItem.typeOfDocs}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Year</label>
                    <p className="text-sky-300 font-mono font-semibold">{selectedItem.year}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Validity</label>
                    <p className="text-white font-medium">
                      {selectedItem.validity ? new Date(selectedItem.validity).toLocaleDateString("en-GB") : "—"}
                    </p>
                  </div>
                </div>

                {selectedItem.attachment?.fileUrl && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <label className="text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Attachment</label>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <svg className="w-8 h-8 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {selectedItem.attachment.originalFileName || "File"}
                        </p>
                      </div>
                      <a
                        href={selectedItem.attachment.fileUrl}
                        download={selectedItem.attachment.originalFileName || "certificate"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-300 bg-sky-500/10 border border-sky-400/30 hover:bg-sky-500/20 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
