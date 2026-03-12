"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditIconButton } from "../../../components/ActionIcons";

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

function getStatusBadge(status) {
  const map = {
    DRAFT: {
      label: "Draft",
      classes:
        "bg-slate-700/40 border-slate-400/60 text-slate-100",
    },
    PENDING: {
      label: "Pending Review",
      classes:
        "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
    },
    APPROVED: {
      label: "Approved",
      classes:
        "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    },
    REJECTED: {
      label: "Rejected",
      classes: "bg-red-500/20 border-red-500/50 text-red-300",
    },
  };

  const cfg = map[status] || map.DRAFT;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

// Generate dynamic years
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function EquipmentBaseStockListPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("DRAFT"); // DRAFT, APPROVED, REJECTED, ALL
  const [availableYears, setAvailableYears] = useState(initialYears);
  const [loadingYears, setLoadingYears] = useState(true);
  const [year, setYear] = useState("");

  // Fetch available years
  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch("/api/qhse/form-checklist/equipment-base-stock-level/list");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.years)) {
          const merged = Array.from(
            new Set([...initialYears, ...data.years])
          ).sort((a, b) => b - a);
          setAvailableYears(merged);
        }
      } finally {
        setLoadingYears(false);
      }
    };
    loadYears();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    setError("");
    try {
      const url = year !== "" && year != null
        ? `/api/qhse/form-checklist/equipment-base-stock-level/list?year=${year}`
        : "/api/qhse/form-checklist/equipment-base-stock-level/list";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load forms");
      }
      setForms(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [year]);

  const filteredForms = forms.filter((form) => {
    if (filter === "ALL") return true;
    if (filter === "DRAFT") return form.status === "DRAFT";
    if (filter === "APPROVED") return form.status === "APPROVED";
    if (filter === "REJECTED") return form.status === "REJECTED";
    return false;
  });

  const handleEdit = (id) => {
    router.push(
      `/qhse/forms-checklist/equipment-base-stock-level/form?edit=${id}&from=list`
    );
  };

  if (loading) {
    return (
      <div className={`${contentClassName} flex items-center justify-center`}>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / Forms & Checklist / STS Equipment Base Stock Level
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">My Equipment Base Stock Forms</h1>
              <p className="text-sm text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-013</span>
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Year Filter */}
            <div className="flex items-center gap-3">
              <a
                href="/templates/controlled-register/QAF-OFD-013.docx"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                title="Download form template (QAF-OFD-013)"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
                </svg>
                Template
              </a>
            </div>
          </div>
          <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden flex-shrink-0">
              <Link
                href="/qhse/forms-checklist/equipment-base-stock-level/form"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Base Stock Form
              </Link>
              <Link
                href="/qhse/forms-checklist/equipment-base-stock-level/list"
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Base Stock List
              </Link>
              <Link
                href="/qhse/forms-checklist/equipment-base-stock-level/admin"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Base Stock Admin
              </Link>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Year filter + Status filter tabs */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
              Year
            </span>
            <select
              className="theme-select rounded-full px-3 py-1.5 text-xs tracking-widest uppercase"
              value={year === null || year === undefined ? "" : year}
              onChange={(e) => {
                const v = e.target.value;
                setYear(v === "" ? "" : Number(v));
              }}
              disabled={loadingYears}
            >
              <option value="">All years</option>
              {loadingYears ? (
                <option disabled>Loading…</option>
              ) : (
                availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))
              )}
            </select>
          </div>
          <div className="flex gap-2">
          {["DRAFT", "APPROVED", "REJECTED", "ALL"].map((key) => {
            const labelMap = {
              DRAFT: "Draft",
              APPROVED: "Approved",
              REJECTED: "Rejected",
              ALL: "All",
            };
            const active = filter === key;
            const base =
              "px-4 py-2 rounded-lg text-sm font-medium transition border";
            let activeClass =
              "bg-slate-700/50 text-white/80 border-sky-400/40";
            if (key === "DRAFT") {
              activeClass =
                "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
            } else if (key === "APPROVED") {
              activeClass =
                "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
            } else if (key === "REJECTED") {
              activeClass =
                "bg-red-500/20 text-red-300 border-red-500/50";
            }
            const inactiveClass =
              "bg-slate-800/40 text-white/70 border-slate-500/40 hover:bg-slate-700/60";

            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`${base} ${active ? activeClass : inactiveClass}`}
              >
                {labelMap[key]}
              </button>
            );
          })}
          </div>
        </div>

        {/* List */}
        {(() => {
          if (filteredForms.length === 0) {
            let message = "No equipment base stock forms found.";
            if (filter === "DRAFT") {
              message = "No draft forms found.";
            } else if (filter === "APPROVED") {
              message = "No approved forms.";
            } else if (filter === "REJECTED") {
              message = "No rejected forms.";
            }
            return (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <p className="text-white/60 text-sm">{message}</p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {filteredForms.map((form) => (
                <div
                  key={form._id}
                  className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 flex items-center justify-between gap-4 hover:border-white/20 transition"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-400">Form code:</span>
                      <span className="text-sm font-mono font-semibold text-sky-300">
                        {form.formCode || "QAF-OFD-013"}
                      </span>
                      <span className="text-xs text-slate-400">Serial:</span>
                      <span className="text-sm font-mono text-white/90">
                        {form.serialNumber || "—"}
                      </span>
                      {getStatusBadge(form.status)}
                    </div>
                    <div className="flex gap-4 text-[11px] text-white/50 flex-wrap">
                      <span>Revision Date: {formatDate(form.revisionDate)}</span>
                      <span>
                        Created: {formatDate(form.createdAt)} • Updated:{" "}
                        {formatDate(form.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {form.status === "DRAFT" && (
                      <EditIconButton
                        onClick={() => handleEdit(form._id)}
                        title="Edit Draft"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}


