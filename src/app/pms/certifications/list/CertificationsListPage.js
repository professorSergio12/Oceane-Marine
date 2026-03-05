"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CertificationsListPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/pms/certifications/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleEdit = (item) => {
    // Navigate to form page with edit data in query params or use state
    router.push(`/pms/certifications/form?edit=${item._id}`);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this certificate? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");
      const res = await fetch(`/api/pms/certifications/${id}/delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to delete");

      setSuccess("Certificate deleted successfully");
      setTimeout(() => {
        setSuccess("");
        fetchList();
      }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 ml-72 pr-4">
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              PMS / Certifications
            </p>
            <h1 className="text-2xl font-bold">Certificates</h1>
          </div>
          <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
            <Link
              href="/pms/certifications/form"
              className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Certificate Form
            </Link>
            <Link
              href="/pms/certifications/list"
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
            >
              Certificate List
            </Link>
          </div>
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-200 text-sm font-medium">
            {success}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="grid grid-cols-6 text-xs uppercase tracking-wide text-slate-300 bg-white/5 px-4 py-3">
            <div>Location</div>
            <div>Equipment Name</div>
            <div>Equipment Type</div>
            <div>Tested By</div>
            <div>Date</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-300">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-300">No records found.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="grid grid-cols-6 items-center px-4 py-3 text-sm"
                >
                  <div className="font-medium text-white">{item.locationName}</div>
                  <div className="text-slate-200">{item.equipmentName || "—"}</div>
                  <div className="text-slate-200">{item.equipmentType || "—"}</div>
                  <div className="text-slate-200">{item.testedBy || "—"}</div>
                  <div className="text-slate-400">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "-"}
                  </div>
                  <div className="text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedItem(item)}
                      disabled={deletingId === item._id}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/50 text-sky-300 hover:bg-sky-500/30 hover:text-sky-200 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={deletingId === item._id}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:bg-orange-500/30 hover:text-orange-200 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      disabled={deletingId === item._id || !!deletingId}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 hover:text-red-200 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 min-w-[80px] justify-center"
                    >
                      {deletingId === item._id ? (
                        <>
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODAL - rendered via Portal to document.body so it's truly centered on viewport */}
      {selectedItem && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl border border-white/20 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border-b border-white/10 px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Certificate Details</h3>
                  <p className="text-xs text-slate-300 mt-0.5">View complete certificate information</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Location</p>
                  </div>
                  <p className="text-base font-semibold text-white">{selectedItem.locationName}</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Equipment Name</p>
                  </div>
                  <p className="text-base font-semibold text-white">{selectedItem.equipmentName || "—"}</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Equipment Type</p>
                  </div>
                  <p className="text-base font-semibold text-white">{selectedItem.equipmentType || "—"}</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tested By</p>
                  </div>
                  <p className="text-base font-semibold text-white">{selectedItem.testedBy || "—"}</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Date</p>
                  </div>
                  <p className="text-base font-semibold text-white">
                    {selectedItem.createdAt
                      ? new Date(selectedItem.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Certificates Section */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Certificates</h4>
                </div>
                <div className="space-y-3">
                  {selectedItem.manufacturingCertificate?.fileUrl && (
                    <div className="group p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 hover:border-emerald-500/50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex-shrink-0">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white mb-1">Manufacturing Certificate</p>
                            <p className="text-xs text-slate-300 truncate">
                              {selectedItem.manufacturingCertificate.originalFileName || "—"}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`/api/pms/certifications/${selectedItem._id}/download?type=manufacturing`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-semibold transition shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center gap-2 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedItem.testCertificate?.fileUrl && (
                    <div className="group p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/30 hover:border-blue-500/50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/30 flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white mb-1">Test Certificate</p>
                            <p className="text-xs text-slate-300 truncate">
                              {selectedItem.testCertificate.originalFileName || "—"}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`/api/pms/certifications/${selectedItem._id}/download?type=test`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm font-semibold transition shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center gap-2 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                  {!selectedItem.manufacturingCertificate?.fileUrl && !selectedItem.testCertificate?.fileUrl && (
                    <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                      <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-slate-400">No certificates available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

