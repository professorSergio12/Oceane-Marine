"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQhseSidebar } from "../QhseSidebarContext";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ControlledDocumentRegisterPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/qhse/controlled-document-register/dynamic");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalDocuments = items.reduce((sum, r) => sum + (r.documentCount || 0), 0);

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              QHSE
            </p>
            <h1 className="text-2xl font-bold">Controlled Document Register</h1>
            <p className="text-xs text-slate-200 mt-1">
              Live index of all QHSE forms and documents. Click a row to go to the module.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <span>
              <span className="text-white font-semibold">{items.length}</span> form types
            </span>
            <span>
              <span className="text-white font-semibold">{totalDocuments}</span> total documents
            </span>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-300 text-sm">
              Loading document register…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-300 text-sm">
              No documents found in the QHSE module.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-200 border-collapse">
                <thead>
                  <tr className="bg-[#366092] text-white">
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-12">
                      No
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide">
                      Form Code
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide min-w-[220px]">
                      Title
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-28 text-center">
                      Documents
                    </th>
                    <th className="border border-slate-400/50 px-3 py-2.5 font-semibold uppercase tracking-wide w-32">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((row, index) => (
                    <tr
                      key={row.formCode + index}
                      onClick={() => row.href && router.push(row.href)}
                      className="hover:bg-sky-500/10 bg-slate-800/30 cursor-pointer transition"
                      title={`Go to ${row.title}`}
                    >
                      <td className="border border-slate-400/40 px-3 py-2 text-slate-400">
                        {index + 1}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 font-mono text-sky-300">
                        {row.formCode || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-white">
                        {row.title || "—"}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-center">
                        {row.documentCount > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                            {row.documentCount}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0</span>
                        )}
                      </td>
                      <td className="border border-slate-400/40 px-3 py-2 text-slate-300 text-xs">
                        {formatDate(row.lastUpdated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
