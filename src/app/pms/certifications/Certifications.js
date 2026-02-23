"use client";

import { useEffect, useState } from "react";

export default function Certifications({ view: controlledView, onViewChange }) {
  const [internalView, setInternalView] = useState("form");
  const view = controlledView ?? internalView;
  const setView = onViewChange ?? setInternalView;

  const [locationName, setLocationName] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  // Fetch list
  const fetchList = async () => {
    try {
      setListLoading(true);
      setListError("");
      const res = await fetch("/api/pms/certifications/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.data || []);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (view === "list") {
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!locationName.trim()) {
      setError("Location name is required");
      return;
    }
    if (!version.trim()) {
      setError("Version is required");
      return;
    }
    if (!file) {
      setError("Please choose a file");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("locationName", locationName.trim());
      formData.append("version", version.trim());
      formData.append("file", file);

      const res = await fetch("/api/pms/certifications/create", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save");

      setMessage("Saved successfully");
      setLocationName("");
      setVersion("");
      setFile(null);
      setTimeout(() => {
        setView("list");
        setMessage("");
      }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-xs tracking-widest text-sky-300">
          PMS / Certifications
        </p>
        <h2 className="text-xl font-bold text-white">
          Certifications
        </h2>
      </div>

      {/* MESSAGES */}
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-200 text-sm font-medium">
          {message}
        </div>
      )}

      {/* FORM VIEW */}
      {view === "form" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-200">Location Name</label>
              <input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                placeholder="Enter location name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-200">Version</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                placeholder="e.g., 1 or 1.1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-200">Upload File</label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  id="cert-file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="cert-file"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl bg-slate-900/20 cursor-pointer hover:bg-slate-900/30 hover:border-sky-400/40 transition group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-10 h-10 mb-3 text-slate-400 group-hover:text-sky-400 transition"
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
                    <p className="mb-2 text-sm text-slate-300">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-400">
                      PDF, Excel (.xlsx, .xls), CSV, Word, Images (MAX. 25MB)
                    </p>
                  </div>
                </label>
              </div>
              {file && (
                <div className="text-xs text-emerald-200 bg-emerald-900/30 border border-emerald-500/30 rounded-lg px-3 py-2">
                  Selected: {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setLocationName("");
                setVersion("");
                setFile(null);
                setError("");
              }}
              className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="space-y-4">
          {listError && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
              {listError}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="grid grid-cols-5 text-xs uppercase tracking-wide text-slate-300 bg-white/5 px-4 py-3">
              <div>Location</div>
              <div>Version</div>
              <div>File</div>
              <div>Date</div>
              <div className="text-right">Action</div>
            </div>

            {listLoading ? (
              <div className="p-6 text-sm text-slate-300">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-slate-300">No records found.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="grid grid-cols-5 items-center px-4 py-3 text-sm"
                  >
                    <div className="font-medium text-white">{item.locationName}</div>
                    <div className="text-slate-200">{item.version || "—"}</div>
                    <div className="text-slate-200 truncate">
                      {(() => {
                        if (item.originalFileName) return item.originalFileName;
                        if (item.fileUrl) return item.fileUrl.split("/").pop();
                        return "—";
                      })()}
                    </div>
                    <div className="text-slate-400">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </div>
                    <div className="text-right">
                      <a
                        href={`/api/pms/certifications/${item._id}/download`}
                        className="text-sky-400 hover:text-sky-300 text-sm"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
