"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { buildDocumentHtml030, buildDocumentHtml030B, buildDocumentHtmlPOAC, getFormNoLineForPdf } from "../sts-form/documentTemplate";
import { useOperationsLoading } from "@/app/operations/OperationsLoadingContext";
import { useOperationsSidebar } from "@/app/operations/OperationsSidebarContext";
import {
  ActionDownloadIcon,
  ActionEditIcon,
  ActionDeleteIcon,
} from "@/app/components/RecordActionIcons";

const sidebarTabs = [
  {
    key: "documentation",
    label: "Documentation",
    href: "/operations/sts-operations/new",
  },
  {
    key: "compatibility",
    label: "Compatibility",
    href: "/operations/sts-operations/new/compatibility",
  },
  {
    key: "forms",
    label: "Forms and checklist",
    submodules: [
      {
        key: "sts-checklist",
        label: "STS Checklist",
        href: "/operations/sts-operations/new/form-checklist/sts-checklist",
      },
      {
        key: "jpo",
        label: "JPO",
        href: "/operations/sts-operations/new/form-checklist/jpo/form",
      },
      {
        key: "quotation",
        label: "Quotation",
        href: "/operations/sts-operations/new/form-checklist/quotations/sts-form",
      },
      {
        key: "inspection-checklist",
        label: "Inspection Checklist",
        href: "/operations/sts-operations/new/form-checklist/inspection-checklist/form",
      },
      {
        key: "manual",
        label: "Manual",
        href: "/operations/sts-operations/new/form-checklist/manual/form",
      },
    ],
  },
  {
    key: "cargos",
    label: "Cargo types",
    href: "/operations/sts-operations/new/cargos",
  },
  {
    key: "locations",
    label: "Locations",
    href: "/operations/sts-operations/new/locations",
  },
  {
    key: "mooring",
    label: "Mooring masters",
    href: "/operations/sts-operations/new/mooringmaster",
  },
];

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

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i < currentYear; i++) years.push(i);
  for (let i = currentYear; i <= currentYear + 5; i++) years.push(i);
  return years;
}

export default function QuotationListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const initialYears = getYears();
  const { isSidebarOpen, setIsSidebarOpen } = useOperationsSidebar();
  const [activeTab, setActiveTab] = useState("forms");
  const [expandedModules, setExpandedModules] = useState(new Set(["forms"]));
  const sidebarRef = useRef(null);
  
  const [stsForms, setStsForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [year, setYear] = useState(currentYear);
  const [quotationTab, setQuotationTab] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);
  const { setPageLoading } = useOperationsLoading();

  const fetchStsForms = async () => {
    setLoading(true);
    setError(null);
    setPageLoading(true);
    try {
      const url = year
        ? `/api/operations/form-checklist/sts-quotation-form/list?year=${year}`
        : "/api/operations/form-checklist/sts-quotation-form/list";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setStsForms(data.data || []);
      else setStsForms([]);
    } catch (err) {
      setError(err.message || "Failed to load quotations");
      setStsForms([]);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchStsForms();
  }, [year]);

  const handleEditSts = (record) => {
    router.push(`/operations/sts-operations/new/form-checklist/quotations/sts-form?edit=${record._id}`);
  };

  const handleDeleteSts = async (record) => {
    if (!confirm(`Are you sure you want to delete this quotation (${record.clientName || record.formType})? This action cannot be undone.`)) {
      return;
    }

    setDeleting(record._id);
    try {
      const res = await fetch(
        `/api/operations/form-checklist/sts-quotation-form/${record._id}/delete`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete record");
      }

      // Refresh the list
      fetchStsForms();
    } catch (err) {
      setError(err.message || "Failed to delete record");
    } finally {
      setDeleting(null);
    }
  };

  const handleDownloadSts = async (record) => {
    let html;
    let defaultFormNo;
    if (record.formType === "OPS-OFD-030B") {
      html = buildDocumentHtml030B(record);
      defaultFormNo = "OPS-OFD-030B";
    } else if (record.formType === "POAC") {
      html = buildDocumentHtmlPOAC(record);
      defaultFormNo = "Form No. OPS-OFD-30A / Rev 1.2 / Issue Date: 20 Aug 2023";
    } else {
      html = buildDocumentHtml030(record);
      defaultFormNo = "Form No. OPS-OFD-30 / Rev 1.1 / Issue Date: 20 Aug 2023";
    }
    const formNoLine = getFormNoLineForPdf(record, defaultFormNo);
    setDownloadingId(record._id);
    try {
      const res = await fetch("/api/operations/form-checklist/sts-quotation-form/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, formNoLine }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `PDF failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${(record.clientName || "quotation").replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to generate PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredForms =
    quotationTab === "all"
      ? stsForms
      : quotationTab === "POAC"
        ? stsForms.filter((r) => r.formType === "POAC")
        : quotationTab === "OPS-OFD-030B"
          ? stsForms.filter((r) => r.formType === "OPS-OFD-030B")
          : stsForms.filter((r) => r.formType === "OPS-OFD-030");

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex">
        <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
          <div className="flex items-center justify-center h-screen">
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex">
      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-full w-[260px] sm:w-[300px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/20 shadow-2xl backdrop-blur-md z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h2 className="text-lg font-bold text-white">Operations Modules</h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition hover:scale-110"
              aria-label="Close sidebar"
            >
              <span className="text-white text-lg">×</span>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent transition-all duration-200">
            <div className="space-y-1.5">
              {sidebarTabs.map((tab) => (
                <div key={tab.key} className="space-y-1">
                  {tab.submodules ? (
                    <>
                      <button
                        onClick={() => {
                          setExpandedModules((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(tab.key)) {
                              newSet.delete(tab.key);
                            } else {
                              newSet.add(tab.key);
                            }
                            return newSet;
                          });
                        }}
                        className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                          activeTab === tab.key
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 scale-[1.02]"
                            : "text-white/90 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="flex-1">{tab.label}</span>
                        <span
                          className={`text-sm transition-transform ${
                            expandedModules.has(tab.key) ? "rotate-90" : ""
                          }`}
                        >
                          ▶
                        </span>
                        {activeTab === tab.key && (
                          <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                        )}
                      </button>
                      {expandedModules.has(tab.key) && (
                        <div className="ml-4 space-y-1 mt-1.5 pl-4 border-l-2 border-orange-500/30">
                          {tab.submodules.map((submodule) => {
                            const basePath = submodule.href.replace(/\/form$|\/list$/, "") || submodule.href;
                            const pathNorm = pathname.replace(/\/$/, "");
                            const isActiveSub =
                              pathNorm === basePath ||
                              pathNorm.startsWith(basePath + "/form") ||
                              pathNorm.startsWith(basePath + "/list");
                            return (
                              <Link
                                key={submodule.key}
                                href={submodule.href}
                                className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                                  isActiveSub
                                    ? "bg-gradient-to-r from-orange-500/90 to-orange-600/90 text-white border-orange-400 shadow-lg"
                                    : "text-white/80 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/10"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-xs">▸</span>
                                  {submodule.label}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={tab.href}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                        activeTab === tab.key
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 scale-[1.02]"
                          : "text-white/90 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10 hover:scale-[1.01]"
                      }`}
                    >
                      <span className="flex-1">{tab.label}</span>
                      {activeTab === tab.key && (
                        <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-slate-800/50">
            <p className="text-[10px] text-slate-400 text-center">
              Operations Management System
            </p>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <div className="fixed left-4 top-4 z-40 flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition border border-orange-400/30 shadow-lg shadow-orange-500/30 hover:scale-110"
            aria-label="Open sidebar"
          >
            <span className="text-white text-xl">☰</span>
          </button>
          <Link
            href="/dashboard"
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? "ml-0 md:ml-72" : "mx-auto max-w-7xl"}`}>
        <div className={`mx-auto py-6 sm:py-10 space-y-4 sm:space-y-6 ${isSidebarOpen ? "max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4" : "px-3 sm:px-6"}`}>
        <header className={`${isSidebarOpen ? "mt-0" : "mt-14"} mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4`}>
            {/* Left: Dashboard */}
            <Link
              href="/dashboard"
              className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
            >
              ← Dashboard
            </Link>

            {/* Center: Heading */}
          <div className="flex-1 flex flex-col items-center text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              Operations / Forms & Checklist / Quotation
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Quotation</h1>
            <p className="text-xs text-slate-200 mt-1">
              View and manage all Quotation records
            </p>
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">
                Year
              </span>
              <select
                className="rounded-full px-3 py-1 text-xs bg-white/5 border border-white/10 text-white"
                value={year || ""}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {initialYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="ml-auto inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/operations/sts-operations/new/form-checklist/quotations/sts-form"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Quotation Form
              </Link>
              <Link
                href="/operations/sts-operations/new/form-checklist/quotations/list"
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                Quotation List
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Quotation type tabs */}
        <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
          {[
            { key: "all", label: "All Quotations" },
            { key: "OPS-OFD-030", label: "STS Proposal (030)" },
            { key: "OPS-OFD-030B", label: "STS Advisor (030B)" },
            { key: "POAC", label: "POAC Quotation" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setQuotationTab(key)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                quotationTab === key
                  ? "bg-orange-500 text-white"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Quotation list */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
            {quotationTab === "all"
              ? "All Quotations"
              : quotationTab === "POAC"
                ? "POAC Quotations"
                : quotationTab === "OPS-OFD-030B"
                  ? "STS Advisor Quotations"
                  : "STS Proposal Quotations"}
          </h2>
          {loading ? (
            <p className="text-white/60 text-sm">Loading quotations…</p>
          ) : filteredForms.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <p className="text-white/60 mb-4">
                {quotationTab === "all"
                  ? "No quotations for the selected year."
                  : `No ${quotationTab === "POAC" ? "POAC" : quotationTab === "OPS-OFD-030B" ? "STS Advisor" : "STS Proposal"} quotations for the selected year.`}
              </p>
              <Link
                href="/operations/sts-operations/new/form-checklist/quotations/sts-form"
                className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition"
              >
                Create Quotation
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Form Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Proposal Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white/90 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-white/90 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredForms.map((row) => (
                      <tr key={row._id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-orange-400">{row.formType || "—"}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">{row.clientName || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                          {formatDate(row.proposalDate || row.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/90">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ActionDownloadIcon
                              onClick={() => handleDownloadSts(row)}
                              disabled={downloadingId === row._id}
                              loading={downloadingId === row._id}
                              title="Download PDF"
                            />
                            <ActionEditIcon onClick={() => handleEditSts(row)} title="Edit" />
                            <ActionDeleteIcon
                              onClick={() => handleDeleteSts(row)}
                              disabled={deleting === row._id}
                              loading={deleting === row._id}
                              title="Delete"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

