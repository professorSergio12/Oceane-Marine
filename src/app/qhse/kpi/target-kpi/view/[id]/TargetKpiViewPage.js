"use client";

import { useQhseSidebar } from "../../../../QhseSidebarContext";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function TargetKpiViewPage() {
  const { contentClassName } = useQhseSidebar();
  const params = useParams();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/qhse/kpi/target/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json.data);
      } catch (err) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className={`${contentClassName} pr-4 flex items-center justify-center py-20`}>
        <p className="text-slate-300">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${contentClassName} pr-4 p-10`}>
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-red-200">
          {error || "Not found"}
        </div>
        <Link
          href="/qhse/kpi/target-kpi/list"
          className="mt-4 inline-block text-sky-300 hover:text-sky-200"
        >
          ← Back to list
        </Link>
      </div>
    );
  }

  const year = data.year ?? new Date().getFullYear();
  const rows = data.rows || [];

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / KPI / Target KPI
            </p>
            <h1 className="text-2xl font-bold">Target KPI – {data.formCode}</h1>
            <div className="flex flex-wrap items-center gap-6 mt-2 text-sm">
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider block">Form Code</span>
                <span className="font-mono font-semibold text-sky-300">{data.formCode || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider block">Serial</span>
                <span className="font-mono font-semibold text-slate-200">{data.serialNumber || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider block">Year</span>
                <span className="font-semibold text-white">{year ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex w-[13rem] rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/kpi/target-kpi/form"
                className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Target KPI
              </Link>
              <Link
                href="/qhse/kpi/create"
                className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                KPI
              </Link>
            </div>
            <div className="flex w-[13rem] rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/kpi/target-kpi/form"
                className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Form
              </Link>
              <Link
                href="/qhse/kpi/target-kpi/list"
                className="flex-1 min-w-0 text-center px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                List
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
          <div className="overflow-x-auto rounded-xl border border-slate-500/30 overflow-hidden">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#366092]">
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                    Title
                  </th>
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide whitespace-nowrap">
                    Targets for {year}
                  </th>
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                    Quarter 1
                  </th>
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                    Quarter 2
                  </th>
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                    Quarter 3
                  </th>
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                    Quarter 4
                  </th>
                  <th className="border border-slate-400/50 px-3 py-2.5 text-left text-white font-semibold uppercase tracking-wide">
                    Targets Achieved
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-white/5">
                    <td className="border border-slate-400/40 px-3 py-2 bg-[#5a8bc4]/80 text-white">
                      {row.title || "—"}
                    </td>
                    <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50 text-white text-center">
                      {row.targetForYear ?? "—"}
                    </td>
                    <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50 text-white text-center">
                      {row.quarter1 ?? "—"}
                    </td>
                    <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50 text-white text-center">
                      {row.quarter2 ?? "—"}
                    </td>
                    <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50 text-white text-center">
                      {row.quarter3 ?? "—"}
                    </td>
                    <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50 text-white text-center">
                      {row.quarter4 ?? "—"}
                    </td>
                    <td className="border border-slate-400/40 px-3 py-2 bg-slate-800/50 text-white text-center">
                      {row.targetsAchieved ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
