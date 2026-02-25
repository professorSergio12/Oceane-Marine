"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";

export default function AuditInspectionPlannerViewPage() {
  const { contentClassName } = useQhseSidebar();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOne = async () => {
      setLoading(true);
      setError("");
      try {
        // Reuse list endpoint, then filter client-side (no single-get endpoint yet)
        const res = await fetch("/api/qhse/audit-inspection-planner/list");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load planner");
        const found = (data.data || []).find((p) => String(p._id) === String(id));
        if (!found) throw new Error("Planner not found");
        setItem(found);
      } catch (err) {
        setError(err.message || "Failed to load planner");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOne();
  }, [id]);

  if (loading) {
    return (
      <div className={`${contentClassName} flex items-center justify-center`}>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={`${contentClassName} pr-4`}>
        <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-4">
          <Link
            href="/qhse/audit-inspection-planner/list"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10 transition"
          >
            ← Back to list
          </Link>
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error || "Planner not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/qhse/audit-inspection-planner/list"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition"
          >
            <span className="text-lg">←</span>
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / Audit & Inspection Planner / View
            </p>
            <h1 className="text-2xl font-bold text-white">Planner Details</h1>
            <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">{item.formCode || "QAF-OFD-048"}</span>
            </p>
          </div>
          <TemplateDownloadLink formCode="QAF-OFD-048" />
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-100">
            <div>
              <div className="text-slate-400 text-xs uppercase">Form Code</div>
              <div className="font-semibold font-mono text-sky-300">{item.formCode || "—"}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase">Serial</div>
              <div className="font-semibold font-mono text-slate-200">{item.serialNumber || "—"}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs uppercase">Issue Date</div>
              <div className="font-semibold">
                {item.issueDate ? new Date(item.issueDate).toLocaleDateString("en-GB") : "—"}
              </div>
            </div>
            {item.status === "Approved" && (
              <div>
                <div className="text-slate-400 text-xs uppercase">Approved By</div>
                <div className="font-semibold">{item.approvedBy || "—"}</div>
              </div>
            )}
          </div>
        </section>

        {(item.categories || []).map((cat) => (
          <section
            key={cat.key}
            className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
          >
            <div className="bg-white/10 px-6 py-3 font-semibold text-white">
              {cat.title}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-200 border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 font-semibold">Audit / Inspection Description</th>
                    <th className="px-4 py-3 font-semibold">Frequency</th>
                    <th className="px-4 py-3 font-semibold">Due by</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Auditor Name</th>
                    <th className="px-4 py-3 font-semibold">Audit Date</th>
                    <th className="px-4 py-3 font-semibold">Remarks</th>
                    <th className="px-4 py-3 font-semibold">File</th>
                  </tr>
                </thead>
                <tbody>
                  {(cat.rows || []).map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5">
                      <td className="px-4 py-2">{row.description || "—"}</td>
                      <td className="px-4 py-2">{row.frequency || "—"}</td>
                      <td className="px-4 py-2">{row.dueBy || "—"}</td>
                      <td className="px-4 py-2">{row.status || "—"}</td>
                      <td className="px-4 py-2">{row.auditorName || "—"}</td>
                      <td className="px-4 py-2">
                        {row.auditDate
                          ? new Date(row.auditDate).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td className="px-4 py-2">{row.remarks || "—"}</td>
                      <td className="px-4 py-2 min-w-[180px]">
                        {row.fileUrl && row.fileName ? (
                          <a
                            href={row.fileUrl.startsWith("http") || row.fileUrl.startsWith("/") ? row.fileUrl : `/api/qhse/file/${row.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-400/40 text-blue-200 bg-blue-500/15 hover:bg-blue-500/25 transition"
                          >
                            <span>📎</span>
                            <span className="truncate max-w-[150px]">{row.fileName}</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

