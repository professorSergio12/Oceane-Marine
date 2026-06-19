"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import HrSidebarWrapper from "../components/HrSidebarWrapper";
import { useHrSidebar } from "../HrSidebarContext";
import SharepointSyncButton from "@/app/components/SharepointSyncButton";

const MODULE = "HR";

function formatSize(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function fileIcon(mimeType = "", name = "") {
  const n = name.toLowerCase();
  if (mimeType.includes("pdf") || n.endsWith(".pdf")) return "📄";
  if (n.match(/\.(xls|xlsx|xlsm|csv)$/)) return "📊";
  if (n.match(/\.(doc|docx)$/)) return "📝";
  if (n.match(/\.(png|jpg|jpeg|gif|webp)$/)) return "🖼️";
  if (n.match(/\.(zip|rar|7z)$/)) return "🗜️";
  return "📎";
}

function DocumentsContent() {
  const { isSidebarOpen } = useHrSidebar();
  const [path, setPath] = useState(MODULE);
  const [data, setData] = useState({ breadcrumb: [], folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (targetPath) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sharepoint/files?module=${MODULE}&path=${encodeURIComponent(targetPath)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(path);
  }, [path, load]);

  const isEmpty = !loading && data.folders.length === 0 && data.files.length === 0;

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      <HrSidebarWrapper />
      <div
        className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${
          isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"
        }`}
      >
        <div className="w-full mx-auto py-4 sm:py-6 md:py-10 space-y-4 sm:space-y-6 px-3 sm:px-4">
          {/* Header */}
          <header
            className={`${isSidebarOpen ? "mt-0" : "mt-8 md:mt-0"} mb-2 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4`}
          >
            <Link
              href="/dashboard"
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
            >
              ← Dashboard
            </Link>
            <div className="flex-1 min-w-0 flex flex-col items-center text-center">
              <p className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.25em] text-sky-300">
                HR / Documents
              </p>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                SharePoint Documents
              </h1>
            </div>
            <div className="shrink-0 flex justify-center md:justify-end">
              <SharepointSyncButton
                moduleKey="hr"
                label="HR"
                onDone={() => load(path)}
              />
            </div>
          </header>

          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-sm text-white/80 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            {data.breadcrumb.map((b, i) => (
              <span key={b.path} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-white/40">/</span>}
                <button
                  type="button"
                  onClick={() => setPath(b.path)}
                  className={`px-1.5 py-0.5 rounded hover:bg-white/10 transition ${
                    i === data.breadcrumb.length - 1
                      ? "text-orange-300 font-semibold"
                      : "text-sky-300"
                  }`}
                >
                  {i === 0 ? "🏠 HR" : b.name}
                </button>
              </span>
            ))}
          </div>

          {/* Content */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
              </div>
            )}

            {error && (
              <div className="p-6 text-center text-red-400">⚠️ {error}</div>
            )}

            {!loading && !error && isEmpty && (
              <div className="p-10 text-center text-white/60">
                <p className="text-4xl mb-2">📂</p>
                <p>Yahan koi file nahi mili.</p>
                <p className="text-sm mt-1">
                  Upar &quot;Sync HR from SharePoint&quot; dabao ya kisi folder mein jao.
                </p>
              </div>
            )}

            {!loading && !error && !isEmpty && (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-white/70 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold w-28">Size</th>
                    <th className="px-4 py-3 font-semibold w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Folders first */}
                  {data.folders.map((f) => (
                    <tr
                      key={f.path}
                      className="hover:bg-white/5 cursor-pointer transition"
                      onClick={() => setPath(f.path)}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-amber-200 font-medium">
                          📁 {f.name}
                          <span className="text-xs text-white/40">({f.count})</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50">—</td>
                      <td className="px-4 py-3 text-right text-sky-300">Open ›</td>
                    </tr>
                  ))}

                  {/* Files */}
                  {data.files.map((file) => (
                    <tr key={file.url} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          {fileIcon(file.mimeType, file.name)} {file.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/files/download?path=${encodeURIComponent(
                            file.url
                          )}&name=${encodeURIComponent(file.name)}`}
                          title={`Download ${file.name}`}
                          className="group/dl inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 shadow-sm transition-all duration-150 hover:border-sky-500 hover:bg-sky-500 hover:text-white hover:shadow-md hover:shadow-sky-500/20"
                        >
                          <svg
                            className="h-3.5 w-3.5 transition-transform duration-150 group-hover/dl:translate-y-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && !isEmpty && (
            <p className="text-xs text-white/40 text-center">
              {data.folders.length} folder(s) · {data.files.length} file(s) at this level
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HrDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}