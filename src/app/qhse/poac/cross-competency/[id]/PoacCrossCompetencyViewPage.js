"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";

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

/** Normalize signature for img src: base64 data URL, raw base64, or http(s) URL. Returns null if not usable as image. */
function getSignatureSrc(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "not available" || trimmed.toLowerCase() === "n/a") return null;
  if (trimmed.startsWith("data:image")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (/^[A-Za-z0-9+/=]{50,}$/.test(trimmed)) return `data:image/png;base64,${trimmed}`;
  return null;
}

// Evaluation items constant (same as form page)
const POAC_EVALUATION_ITEMS = [
  { srNo: 1, area: "Suitability of vessels checked. (Mooring plans, STS plans and Q88s reviewed)" },
  { srNo: 2, area: "Risk assessments and JPO reviewed" },
  { srNo: 3, area: "Ship standard Questionnaire reviewed" },
  { srNo: 4, area: "Checked if nighttime berthing is allowed" },
  { srNo: 5, area: "Weather forecasts reviewed" },
  { srNo: 6, area: "Traffic Density with regards to STS Location Considered" },
  { srNo: 7, area: "Suitable anchoring location with regard to vessel draft etc" },
  { srNo: 8, area: "Length of hose string requirements checked" },
  { srNo: 9, area: "Copies of valid STS gear equipment certification" },
  { srNo: 10, area: "Information shared with the vessel for arrival and POAC boarding" },
  { srNo: 11, area: "Safety meeting with support craft crew" },
  { srNo: 12, area: "Condition of Fender and Hoses checked" },
  { srNo: 13, area: "Moorings and additional equipment checked (i.e., split pins, bolts, nuts, gaskets, personnel basket)" },
  { srNo: 14, area: "Conditions of hose lifting slings used" },
  { srNo: 15, area: "Transfer of equipment on support craft" },
  { srNo: 16, area: "Safety meeting conducted with crew and Master" },
  { srNo: 17, area: "Communication skills with crew" },
  { srNo: 18, area: "Inspection of Mooring Winches and associated mooring gears" },
  { srNo: 19, area: "Safety awareness" },
  { srNo: 20, area: "Communication with support craft" },
  { srNo: 21, area: "Rigging of Primary /Secondary Fenders" },
  { srNo: 22, area: "Readiness to heave up anchor /Readiness of Mooring stations" },
  { srNo: 23, area: "Navigation warning broadcast" },
  { srNo: 24, area: "Safety Meeting conducted with crew. (Including snap back zone awareness)" },
  { srNo: 25, area: "Approach and Mooring Plan discussed with Master" },
  { srNo: 26, area: "ME Testing prior to use" },
  { srNo: 27, area: "Agreed means of communication VHF Channel" },
  { srNo: 28, area: "Discussed emergency procedures and ME speed -Manoeuvring" },
  { srNo: 29, area: "OCIMF Checklist complied with" },
  { srNo: 30, area: "Proper handover of command" },
  { srNo: 31, area: "Communication with bridge team / exchange of information" },
  { srNo: 32, area: "Regular monitoring of traffic and vessel's speed" },
  { srNo: 33, area: "Control of mooring operation" },
  { srNo: 34, area: "Check status of impressed current system" },
  { srNo: 35, area: "Interaction" },
  { srNo: 36, area: "Status of radars" },
  { srNo: 37, area: "Parallel landing" },
  { srNo: 38, area: "Angle of approach" },
  { srNo: 39, area: "Positioning of vessel" },
  { srNo: 40, area: "Checking helm indicator" },
  { srNo: 41, area: "Manoeuvring vessels to anchor" },
  { srNo: 42, area: "Communication during approach and mooring" },
  { srNo: 43, area: "Safety Meeting conducted with crew" },
  { srNo: 44, area: "Crane's operational readiness and condition" },
  { srNo: 45, area: "Checking manifold connection" },
  { srNo: 46, area: "Cargo hazard precautions explained to crew. (i.e., H2S monitors for personnel)" },
  { srNo: 47, area: "MSDS for the cargo obtained" },
  { srNo: 48, area: "Hose String and gasket connections" },
  { srNo: 49, area: "Safety Meeting conducted with crew. (Including instruction to regularly tend vessel and fender moorings)" },
  { srNo: 50, area: "OCIMF STS Checklists complied" },
  { srNo: 51, area: "Deck rounds and Manifold pressure monitored" },
  { srNo: 52, area: "Authorities informed of completion of transfer" },
  { srNo: 53, area: "Safety meeting conducted with crew" },
  { srNo: 54, area: "Cargo hose draining and hose disconnection" },
  { srNo: 55, area: "Hoses blanked with bolts inward" },
  { srNo: 56, area: "Informed office to arrange support craft for demobilisation" },
  { srNo: 57, area: "Safety Meeting conducted with crew" },
  { srNo: 58, area: "Avoided crossing ahead" },
  { srNo: 59, area: "OCIMF STS Checklists completed" },
  { srNo: 60, area: "Ship handling skills" },
  { srNo: 61, area: "Regular monitoring of Swell and wind direction" },
  { srNo: 62, area: "Unmooring plan discussed" },
  { srNo: 63, area: "Safety meeting conducted with crew" },
  { srNo: 64, area: "Communication skills with crew" },
  { srNo: 65, area: "Offloading hoses to the support craft" },
  { srNo: 66, area: "De-rigging Primary /Secondary Fenders" },
  { srNo: 67, area: "Control during operations" },
  { srNo: 68, area: "Weather forecasts reviewed regularly" },
  { srNo: 69, area: "Care of STS equipment" },
  { srNo: 70, area: "Use of PPE" },
  { srNo: 71, area: "General Safety awareness" },
  { srNo: 72, area: "Regular operational updates" },
  { srNo: 73, area: "Timely reporting of issues (Advisement of issues in good time to allow for prompt action)" },
  { srNo: 74, area: "General communication with Operations Team" },
  { srNo: 75, area: "Correctly completing and efficiently submitting STS documentation" },
];

const evaluationCategories = [
  { name: "Prior to commencement of Operations", start: 1, end: 9 },
  { name: "Mobilization", start: 10, end: 15 },
  { name: "Rigging of vessel", start: 16, end: 23 },
  { name: "Approach and mooring operation", start: 24, end: 42 },
  { name: "Hose connection", start: 43, end: 48 },
  { name: "Cargo operations", start: 49, end: 51 },
  { name: "Hose draining and disconnection", start: 52, end: 56 },
  { name: "Unmooring", start: 57, end: 62 },
  { name: "De-Mobilization", start: 63, end: 66 },
  { name: "General", start: 67, end: 71 },
  { name: "Office Requirements", start: 72, end: 75 },
];

export default function PoacCrossCompetencyViewPage() {
  const { contentClassName } = useQhseSidebar();
  const params = useParams();
  const router = useRouter();
  const formId = params.id;

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/qhse/cross-competency/${formId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load form");
        }

        setForm(data.data);
      } catch (err) {
        setError(err.message || "Failed to load form");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleDownload = async () => {
    if (!formId || !form) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/qhse/cross-competency/${formId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to download");
      }
      const blob = await res.blob();
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let fileName = `POAC-Cross-Competency-${form.serialNumber || formId}.docx`;
      const contentDisposition = res.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^";]+)/i) || contentDisposition.match(/filename="?([^"]+)"?/i);
        if (match && match[1]) {
          fileName = match[1].trim().replace(/"$/g, "");
        }
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      globalThis.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err.message || "Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Draft: "bg-slate-500/15 text-slate-300 border-slate-400/40",
      Submitted: "bg-blue-500/15 text-blue-300 border-blue-400/40",
      Reviewed: "bg-purple-500/15 text-purple-300 border-purple-400/40",
      Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
    };

    const className = statusConfig[status] || statusConfig.Draft;

    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] border ${className}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`${contentClassName} flex items-center justify-center`}>
        <p className="text-slate-300">Loading form...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className={`${contentClassName} pr-4`}>
        <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-10">
          <div className="rounded-3xl border border-red-500/40 bg-red-950/40 p-6">
            <p className="text-red-300">{error || "Form not found"}</p>
            <Link
              href="/qhse/poac/cross-competency/list"
              className="mt-4 inline-block rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
            >
              Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        <header className="mt-12 md:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
              QHSE / POAC Cross Competency
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white">View POAC Cross Competency Form</h1>
          </div>
          <div className="flex gap-2">
            <TemplateDownloadLink formCode="QAF-OFD-009" />
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-full border cursor-pointer border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition inline-flex items-center gap-1.5 disabled:opacity-50"
              title="Download as Word"
            >
              {downloading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Download as Word
            </button>
            {form.status === "Draft" && (
              <Link
                href={`/qhse/poac/cross-competency/form?edit=${form._id}`}
                className="rounded-full border cursor-pointer border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Edit
              </Link>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {/* Form & POAC Details – actual form data in one card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-orange-300">Form & POAC Details</h2>
              <button
                type="button"
                onClick={() => router.push("/qhse/poac/cross-competency/list")}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition shrink-0"
                title="Close"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Form Code</label>
                <p className="text-sm text-white font-mono">{form.formCode || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Serial No</label>
                <p className="text-sm text-white font-mono">{form.serialNumber || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Name of POAC</label>
                <p className="text-sm text-white">{form.nameOfPOAC || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Evaluation Date</label>
                <p className="text-sm text-white">{formatDate(form.evaluationDate)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Job Ref No</label>
                <p className="text-sm text-white">{form.jobRefNo || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Lead POAC</label>
                <p className="text-sm text-white">{form.leadPOAC || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Discharging Vessel</label>
                <p className="text-sm text-white">{form.dischargingVessel || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Receiving Vessel</label>
                <p className="text-sm text-white">{form.receivingVessel || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Location</label>
                <p className="text-sm text-white">{form.location || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Type of Operation</label>
                <p className="text-sm text-white">{form.typeOfOperation || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Weather Condition</label>
                <p className="text-sm text-white">{form.weatherCondition || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Deadweight Discharging</label>
                <p className="text-sm text-white">{form.deadweightDischarging ?? "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Deadweight Receiving</label>
                <p className="text-sm text-white">{form.deadweightReceiving ?? "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Rev No</label>
                <p className="text-sm text-white">{form.revNo || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Rev Date</label>
                <p className="text-sm text-white">{formatDate(form.revDate)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Approved By</label>
                <p className="text-sm text-white">{form.approvedBy || "—"}</p>
              </div>
            </div>
          </div>

          {/* Evaluation Items */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">Evaluation Items</h2>
            <div className="space-y-6">
              {evaluationCategories.map((category) => {
                const categoryItems = (form.evaluationItems || []).filter(
                  (item) => item.srNo >= category.start && item.srNo <= category.end
                );

                if (categoryItems.length === 0) return null;

                return (
                  <div key={category.name} className="border border-white/10 rounded-xl p-4 bg-slate-900/20">
                    <h3 className="text-sm font-bold text-cyan-300 mb-3">{category.name}</h3>
                    <div className="space-y-3">
                      {categoryItems.map((item) => {
                        const hasEvaluation = item.evaluation !== null && item.evaluation !== undefined;
                        const evaluationValue = hasEvaluation ? parseInt(item.evaluation) : null;

                        return (
                          <div key={item.srNo} className="border border-white/5 rounded-lg p-3 bg-slate-900/30">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-slate-300 min-w-[40px]">
                                {item.srNo}.
                              </span>
                              <div className="flex-1 space-y-2">
                                <p className="text-xs text-slate-200">{item.area}</p>
                                <div className="flex gap-4 items-start">
                                  <div>
                                    <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                                      Evaluation
                                    </label>
                                    <p className="text-sm text-white font-semibold">
                                      {hasEvaluation ? evaluationValue : "—"}
                                    </p>
                                  </div>
                                  {(item.remarks || (hasEvaluation && evaluationValue < 3)) && (
                                    <div className="flex-1">
                                      <label className="block text-[10px] uppercase tracking-wide text-slate-400 mb-1">
                                        Remarks
                                      </label>
                                      <p className="text-xs text-slate-200">
                                        {item.remarks || "—"}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lead POAC Comments & Signatures */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">Lead POAC Comments & Signatures</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                  Lead POAC Comment
                </label>
                <p className="text-sm text-white whitespace-pre-wrap">
                  {form.leadPOACComment || "—"}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                    Lead POAC Name
                  </label>
                  <p className="text-sm text-white">{form.leadPOACName || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                    Lead POAC Date
                  </label>
                  <p className="text-sm text-white">{formatDate(form.leadPOACDate)}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                  Lead POAC Signature
                </label>
                {getSignatureSrc(form.leadPOACSignature) ? (
                  <div className="p-4 rounded-lg border border-white/20 bg-white/5 inline-block">
                    <img
                      src={getSignatureSrc(form.leadPOACSignature)}
                      alt="Lead POAC Signature"
                      className="max-h-24 w-auto max-w-[200px] object-contain block"
                      decoding="async"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.classList.remove("hidden");
                      }}
                    />
                    <span className="text-slate-500 text-xs hidden">Signature image could not be displayed.</span>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-white/10 bg-white/5 inline-flex items-center justify-center min-h-[80px] min-w-[160px]">
                    <span className="text-slate-500 text-sm">Signature not available</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Operations Support Team Comment */}
          {form.opsSupportTeamComment && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
              <h2 className="text-lg font-bold mb-4 text-orange-300">Operations Support Team Comment</h2>
              <p className="text-sm text-white whitespace-pre-wrap">
                {form.opsSupportTeamComment}
              </p>
            </div>
          )}

          {/* Ops Team Signatures */}
          {(form.opsTeamName || form.opsTeamSupdtName || form.opsTeamSignature || form.opsTeamSupdtSignature) && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
              <h2 className="text-lg font-bold mb-4 text-orange-300">Operations Team Signatures</h2>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                      Ops Team Name
                    </label>
                    <p className="text-sm text-white">{form.opsTeamName || "—"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                      Ops Team Date
                    </label>
                    <p className="text-sm text-white">{formatDate(form.opsTeamDate)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                      Ops Team Signature
                    </label>
                    {getSignatureSrc(form.opsTeamSignature) ? (
                      <div className="p-4 rounded-lg border border-white/20 bg-white/5 inline-block">
                        <img
                          src={getSignatureSrc(form.opsTeamSignature)}
                          alt="Ops Team Signature"
                          className="max-h-24 w-auto max-w-[200px] object-contain block"
                          decoding="async"
                          onError={(e) => {
                            e.target.style.display = "none";
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                        <span className="text-slate-500 text-xs hidden">Signature image could not be displayed.</span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-white/10 bg-white/5 inline-flex items-center justify-center min-h-[80px] min-w-[160px]">
                        <span className="text-slate-500 text-sm">Signature not available</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                      Ops Team Superintendent Name
                    </label>
                    <p className="text-sm text-white">{form.opsTeamSupdtName || "—"}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                      Ops Team Superintendent Date
                    </label>
                    <p className="text-sm text-white">{formatDate(form.opsTeamSupdtDate)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">
                      Ops Team Superintendent Signature
                    </label>
                    {getSignatureSrc(form.opsTeamSupdtSignature) ? (
                      <div className="p-4 rounded-lg border border-white/20 bg-white/5 inline-block">
                        <img
                          src={getSignatureSrc(form.opsTeamSupdtSignature)}
                          alt="Ops Team Superintendent Signature"
                          className="max-h-24 w-auto max-w-[200px] object-contain block"
                          decoding="async"
                          onError={(e) => {
                            e.target.style.display = "none";
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                        <span className="text-slate-500 text-xs hidden">Signature image could not be displayed.</span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg border border-white/10 bg-white/5 inline-flex items-center justify-center min-h-[80px] min-w-[160px]">
                        <span className="text-slate-500 text-sm">Signature not available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <div className="grid gap-4 md:grid-cols-2 text-xs text-slate-400">
              <div>
                <span className="font-semibold">Created:</span> {formatDate(form.createdAt)}
              </div>
              {form.updatedAt && (
                <div>
                  <span className="font-semibold">Last Updated:</span> {formatDate(form.updatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

