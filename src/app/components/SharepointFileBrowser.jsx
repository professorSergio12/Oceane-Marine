"use client";

import { useState, useEffect, useCallback } from "react";
import SharepointSyncButton from "@/app/components/SharepointSyncButton";

/**
 * Reusable SharePoint Documents browser (folder navigation + download).
 * Used by each module's Documents page.
 *
 *   <SharepointFileBrowser module="Operations" label="Operations" />
 *
 * - `module` must match the label stored in Mongo (HR | PMS | Operations | QHSE)
 * - `label`  shown on the sync button + home breadcrumb
 */
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
  if (/\.(xls|xlsx|xlsm|csv)$/.exec(n)) return "📊";
  if (/\.(doc|docx)$/.exec(n)) return "📝";
  if (/\.(png|jpg|jpeg|gif|webp)$/.exec(n)) return "🖼️";
  if (/\.(zip|rar|7z)$/.exec(n)) return "🗜️";
  if (/\.(msg|eml)$/.exec(n)) return "✉️";
  return "📎";
}

export default function SharepointFileBrowser({ module, label }) {
  const [path, setPath] = useState(module);
  const [data, setData] = useState({ breadcrumb: [], folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (targetPath) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/sharepoint/files?module=${encodeURIComponent(module)}&path=${encodeURIComponent(targetPath)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [module]
  );

  useEffect(() => {
    load(path);
  }, [path, load]);

  const isEmpty = !loading && data.folders.length === 0 && data.files.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sync button */}
      <div className="flex justify-center sm:justify-end">
        <SharepointSyncButton
          moduleKey={module.toLowerCase()}
          label={label}
          onDone={() => load(path)}
        />
      </div>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
        {data.breadcrumb.map((b, i) => (
          <span key={b.path} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-white/40">/</span>}
            <button
              type="button"
              onClick={() => setPath(b.path)}
              className={`rounded px-1.5 py-0.5 transition hover:bg-white/10 ${
                i === data.breadcrumb.length - 1
                  ? "font-semibold text-orange-300"
                  : "text-sky-300"
              }`}
            >
              {i === 0 ? `🏠 ${label}` : b.name}
            </button>
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-2xl backdrop-blur-md">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
          </div>
        )}

        {error && <div className="p-6 text-center text-red-400">⚠️ {error}</div>}

        {!loading && !error && isEmpty && (
          <div className="p-10 text-center text-white/60">
            <p className="mb-2 text-4xl">📂</p>
            <p>Yahan koi file nahi mili.</p>
            <p className="mt-1 text-sm">
              Upar &quot;Sync {label} from SharePoint&quot; dabao ya kisi folder mein jao.
            </p>
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/70">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="w-28 px-4 py-3 font-semibold">Size</th>
                <th className="w-32 px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.folders.map((f) => (
                <tr
                  key={f.path}
                  className="cursor-pointer transition hover:bg-white/5"
                  onClick={() => setPath(f.path)}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-amber-200">
                      📁 {f.name}
                      <span className="text-xs text-white/40">({f.count})</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">—</td>
                  <td className="px-4 py-3 text-right text-sky-300">Open ›</td>
                </tr>
              ))}

              {data.files.map((file) => (
                <tr key={file.url} className="transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      {fileIcon(file.mimeType, file.name)} {file.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{formatSize(file.size)}</td>
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
        <p className="text-center text-xs text-white/40">
          {data.folders.length} folder(s) · {data.files.length} file(s) at this level
        </p>
      )}
    </div>
  );
}
