"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CertificationsListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
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
    load();
  }, []);

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

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="grid grid-cols-5 text-xs uppercase tracking-wide text-slate-300 bg-white/5 px-4 py-3">
            <div>Location</div>
            <div>Version</div>
            <div>File</div>
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
    </div>
  );
}

