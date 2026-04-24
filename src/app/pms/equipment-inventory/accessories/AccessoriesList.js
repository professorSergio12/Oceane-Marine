"use client";

import { useCallback, useEffect, useState } from "react";
import { useOperationsClientPagination } from "@/app/operations/hooks/useOperationsClientPagination";
import OperationsListPaginationFooter from "@/app/operations/components/OperationsListPaginationFooter";
import OperationsSelectField from "@/app/operations/components/OperationsSelectField";
import {
  ActionEditIcon,
  ActionDeleteIcon,
} from "@/app/components/RecordActionIcons";
import { usePmsRole } from "@/hooks/usePmsRole";

function CertLink({ cert, label }) {
  if (!cert?.fileUrl) return null;
  return (
    <a
      href={cert.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={cert.originalFileName || label}
      className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/20 transition"
    >
      <svg
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 10-5.656-5.656L5.757 10.586a6 6 0 108.486 8.486L20 13"
        />
      </svg>
      {label}
    </a>
  );
}

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i += 1) {
    years.push(i);
  }
  for (let i = currentYear; i <= currentYear + 5; i += 1) {
    years.push(i);
  }
  return years;
}

export default function AccessoriesList({ onEditItem }) {
  const { canEdit, canDelete } = usePmsRole();
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);

  const loadAccessories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const category = activeTab !== "ALL" ? activeTab : null;
      const url = `/api/pms/equipment-inventory/accessories/list?year=${year}${
        category ? `&category=${category}` : ""
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load accessories");
      setAccessories(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load accessories");
    } finally {
      setLoading(false);
    }
  }, [year, activeTab]);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await fetch(`/api/pms/equipment-inventory/accessories/list`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.years) && data.years.length > 0) {
          setYears(data.years);
          setYear(data.years[0]);
        }
      } catch {
        // ignore
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    loadAccessories();
  }, [loadAccessories]);

  const accessoriesPagination = useOperationsClientPagination(
    accessories,
    `${year}|${activeTab}`
  );
  const {
    paginatedItems: paginatedAccessories,
    ...accessoriesPaginationFooterProps
  } = accessoriesPagination;

  const handleDelete = async (item) => {
    if (!item?._id || !canDelete) return;
    if (
      !confirm(
        `Delete accessory "${item.equipmentName || item.equipmentNo || "record"}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(item._id);
    setError("");
    try {
      const res = await fetch(
        `/api/pms/equipment-inventory/accessories/${item._id}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete accessory");
      }
      await loadAccessories();
    } catch (err) {
      setError(err.message || "Failed to delete accessory");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative z-40 flex items-start justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Accessories Inventory
          </h2>
          <p className="text-sm text-white/60">List View</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-200">
              Year
            </span>
            <OperationsSelectField
              variant="pill"
              ariaLabel="Year filter"
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              options={(years.length ? years : getYears()).map((y) => ({
                value: String(y),
                label: String(y),
              }))}
              className="min-w-0 w-[6.25rem] sm:w-32"
              triggerClassName="ops-select-trigger w-full rounded-full px-3 py-1 text-xs tracking-widest uppercase"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "ALL"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("REGULAR")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "REGULAR"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          Regular
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("OCCASIONAL")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "OCCASIONAL"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/40"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
          }`}
        >
          Occasional
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="relative z-0 rounded-3xl border border-white/10 bg-[#0b2740]/75 backdrop-blur-[2px] p-4 sm:p-6 shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-white/60">Loading accessories...</p>
          </div>
        ) : accessories.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-white/60">
              No accessories found for the selected year and category.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto styled-scrollbar">
              <table className="min-w-[520px] w-full text-sm text-left">
                <thead className="text-xs uppercase tracking-wide text-slate-300 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Equipment No</th>
                    <th className="px-4 py-3">Equipment Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Certificates</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedAccessories.map((item) => (
                    <tr key={item._id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white">
                        {item.category === "REGULAR"
                          ? item.equipmentNo || "—"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/90">
                        {item.equipmentName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            item.category === "REGULAR"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {item.category || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            item.status === "ACTIVE"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {item.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.manufacturingCertificate?.fileUrl ||
                        item.testCertificate?.fileUrl ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CertLink
                              cert={item.manufacturingCertificate}
                              label="Mfg"
                            />
                            <CertLink
                              cert={item.testCertificate}
                              label="Test"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {canEdit && onEditItem && (
                            <ActionEditIcon
                              onClick={() => onEditItem(item)}
                              title="Edit accessory"
                            />
                          )}
                          {canDelete && (
                            <ActionDeleteIcon
                              loading={deletingId === item._id}
                              onClick={() => handleDelete(item)}
                              title="Delete accessory"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <OperationsListPaginationFooter
              {...accessoriesPaginationFooterProps}
              className="overflow-visible"
            />
          </>
        )}
      </div>
    </div>
  );
}
