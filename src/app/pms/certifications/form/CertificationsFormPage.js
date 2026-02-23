"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CertificationsFormPage() {
  const router = useRouter();
  const [locationName, setLocationName] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setTimeout(() => router.push("/pms/certifications/list"), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-bold">New Certificate</h1>
          </div>
          <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
            <Link
              href="/pms/certifications/form"
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
            >
              Certificate Form
            </Link>
            <Link
              href="/pms/certifications/list"
              className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
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
        {message && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-200 text-sm font-medium">
            {message}
          </div>
        )}

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
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10 transition"
            >
              Cancel
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
      </div>
    </div>
  );
}

