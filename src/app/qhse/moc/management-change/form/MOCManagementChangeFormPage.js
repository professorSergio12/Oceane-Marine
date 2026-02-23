"use client";

import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function MOCManagementChangeFormPage() {
  const { contentClassName } = useQhseSidebar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear + 5; y >= currentYear - 7; y--) {
    yearOptions.push(y);
  }

  const [form, setForm] = useState({
    year: currentYear,
    proposedChange: "",
    reasonForChange: "",
    proposedBy: "",
    mocInitiatedBy: "",
    targetImplementationDate: "",
    potentialConsequences: {
      environment: false,
      safety: false,
      contractual: false,
      cost: false,
      operational: false,
      reputation: false,
      remarks: "",
    },
    equipmentFacilityDocumentationAffected: "",
    riskAssessmentRequired: false,
    riskLevel: "",
    reviewerComments: "",
    trainingRequired: false,
    trainingDetails: "",
    documentChangeRequired: false,
    dcrNumber: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setForm((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: child === "remarks" ? value : checked,
        },
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Load existing draft data when editing from list (?edit=id)
  useEffect(() => {
    const loadExisting = async () => {
      if (!editId) return;
      setLoadingExisting(true);
      setError("");
      try {
        const res = await fetch(
          `/api/qhse/moc/management-change/${editId}/status`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load MOC draft");
        }

        const m = data.data;
        if (!m) return;

        const docYear =
          m.year != null && !Number.isNaN(Number(m.year))
            ? Number(m.year)
            : m.initiationDate
              ? new Date(m.initiationDate).getFullYear()
              : currentYear;

        setForm({
          year: docYear,
          proposedChange: m.proposedChange || "",
          reasonForChange: m.reasonForChange || "",
          proposedBy: m.proposedBy || "",
          mocInitiatedBy: m.mocInitiatedBy || "",
          targetImplementationDate: m.targetImplementationDate
            ? new Date(m.targetImplementationDate).toISOString().slice(0, 10)
            : "",
          potentialConsequences: {
            environment: m.potentialConsequences?.environment || false,
            safety: m.potentialConsequences?.safety || false,
            contractual: m.potentialConsequences?.contractual || false,
            cost: m.potentialConsequences?.cost || false,
            operational: m.potentialConsequences?.operational || false,
            reputation: m.potentialConsequences?.reputation || false,
            remarks: m.potentialConsequences?.remarks || "",
          },
          equipmentFacilityDocumentationAffected:
            m.equipmentFacilityDocumentationAffected || "",
          riskAssessmentRequired: m.riskAssessmentRequired || false,
          riskLevel: m.riskLevel || "",
          reviewerComments: m.reviewerComments || "",
          trainingRequired: m.trainingRequired || false,
          trainingDetails: m.trainingDetails || "",
          documentChangeRequired: m.documentChangeRequired || false,
          dcrNumber: m.dcrNumber || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExisting();
  }, [editId]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const formData = {
        action: "draft",
        year: form.year != null ? Number(form.year) : currentYear,
        proposedChange: form.proposedChange?.trim(),
        reasonForChange: form.reasonForChange?.trim(),
        proposedBy: form.proposedBy?.trim(),
        mocInitiatedBy: form.mocInitiatedBy?.trim(),

        ...(form.targetImplementationDate && {
          targetImplementationDate: form.targetImplementationDate,
        }),
        potentialConsequences: {
          environment: form.potentialConsequences.environment,
          safety: form.potentialConsequences.safety,
          contractual: form.potentialConsequences.contractual,
          cost: form.potentialConsequences.cost,
          operational: form.potentialConsequences.operational,
          reputation: form.potentialConsequences.reputation,
          remarks: form.potentialConsequences.remarks?.trim() || "",
        },
        equipmentFacilityDocumentationAffected:
          form.equipmentFacilityDocumentationAffected?.trim(),
        riskAssessmentRequired: form.riskAssessmentRequired,
        ...(form.riskLevel && { riskLevel: form.riskLevel }),
        reviewerComments: form.reviewerComments?.trim(),
        trainingRequired: form.trainingRequired,
        trainingDetails: form.trainingDetails?.trim(),
        documentChangeRequired: form.documentChangeRequired,
        dcrNumber: form.dcrNumber?.trim(),
      };

      const endpoint = isEditMode
        ? `/api/qhse/moc/management-change/${editId}/update`
        : "/api/qhse/moc/management-change/create";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save draft");
      }

      setSuccess("Draft saved successfully");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = {
        action: "submit",
        year: form.year != null ? Number(form.year) : currentYear,
        proposedChange: form.proposedChange.trim(),
        reasonForChange: form.reasonForChange.trim(),
        proposedBy: form.proposedBy.trim(),
        mocInitiatedBy: form.mocInitiatedBy.trim(),

        ...(form.targetImplementationDate && {
          targetImplementationDate: form.targetImplementationDate,
        }),
        potentialConsequences: {
          environment: form.potentialConsequences.environment,
          safety: form.potentialConsequences.safety,
          contractual: form.potentialConsequences.contractual,
          cost: form.potentialConsequences.cost,
          operational: form.potentialConsequences.operational,
          reputation: form.potentialConsequences.reputation,
          remarks: form.potentialConsequences.remarks?.trim() || "",
        },
        equipmentFacilityDocumentationAffected:
          form.equipmentFacilityDocumentationAffected?.trim(),
        riskAssessmentRequired: form.riskAssessmentRequired,
        riskLevel: form.riskLevel,
        reviewerComments: form.reviewerComments?.trim(),
        trainingRequired: form.trainingRequired,
        trainingDetails: form.trainingDetails?.trim(),
        documentChangeRequired: form.documentChangeRequired,
        dcrNumber: form.dcrNumber?.trim(),
      };

      const endpoint = isEditMode
        ? `/api/qhse/moc/management-change/${editId}/submit`
        : "/api/qhse/moc/management-change/create";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit form");
      }

      setSuccess("Form submitted successfully");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${contentClassName} pr-4`}>
      <div className="mx-auto max-w-[95%] pl-4 pr-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-300">
              QHSE / MOC / Management of Change
            </p>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Edit Management of Change Draft" : "Management of Change"}
            </h1>
            <p className="text-xs text-slate-200 mt-1">
              Form code: <span className="font-mono font-semibold text-sky-300">QAF-OFD-058</span>
              {" • "}
              Create or update a Management of Change request.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-200">Year</span>
              <select
                id="year"
                name="year"
                value={form.year ?? currentYear}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    year: Number(e.target.value),
                  }))
                }
                className="rounded-lg px-3 py-2 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[5rem]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-flex rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/moc/management-change/form"
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                MOC Form
              </Link>
              <Link
                href="/qhse/moc/management-change/list"
                className="px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                MOC List
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl px-4 py-3 text-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-3 text-emerald-200 text-sm font-medium">
            {success}
          </div>
        )}

        <form className="space-y-8">
          {/* Basic Information */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="proposedChange"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  Proposed Change <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="proposedChange"
                  name="proposedChange"
                  value={form.proposedChange}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Describe the proposed change..."
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="reasonForChange"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  Reason for Change <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="reasonForChange"
                  name="reasonForChange"
                  value={form.reasonForChange}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="e.g., Management change – CEO takeover"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="proposedBy"
                    className="block text-sm font-medium text-white/90 mb-2"
                  >
                    Proposed By <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="proposedBy"
                    type="text"
                    name="proposedBy"
                    value={form.proposedBy}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Enter name or identifier"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="mocInitiatedBy"
                    className="block text-sm font-medium text-white/90 mb-2"
                  >
                    MOC Initiated By <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="mocInitiatedBy"
                    type="text"
                    name="mocInitiatedBy"
                    value={form.mocInitiatedBy}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Enter name or identifier"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="targetImplementationDate"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  Target Implementation Date
                </label>
                <input
                  id="targetImplementationDate"
                  type="date"
                  name="targetImplementationDate"
                  value={form.targetImplementationDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* Impact & Risk Assessment */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">
              Impact & Risk Assessment
            </h2>

            <div className="space-y-4">
              <div>
                <p className="block text-sm font-medium text-white/90 mb-3">
                  Potential Consequences (Select all that apply)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    "environment",
                    "safety",
                    "contractual",
                    "cost",
                    "operational",
                    "reputation",
                  ].map((key) => (
                    <label
                      key={key}
                      htmlFor={`potentialConsequences.${key}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        id={`potentialConsequences.${key}`}
                        name={`potentialConsequences.${key}`}
                        checked={form.potentialConsequences[key]}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-sm text-white/90 capitalize">
                        {key}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="potentialConsequencesRemarks"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  Remarks on Potential Consequences
                </label>
                <textarea
                  id="potentialConsequencesRemarks"
                  name="potentialConsequences.remarks"
                  value={form.potentialConsequences.remarks}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Additional remarks..."
                />
              </div>

              <div>
                <label
                  htmlFor="equipmentFacilityDocumentationAffected"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  Equipment/Facility/Documentation Affected
                </label>
                <textarea
                  id="equipmentFacilityDocumentationAffected"
                  name="equipmentFacilityDocumentationAffected"
                  value={form.equipmentFacilityDocumentationAffected}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Describe affected equipment, facilities, or documentation..."
                />
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="riskAssessmentRequired"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="riskAssessmentRequired"
                    name="riskAssessmentRequired"
                    checked={form.riskAssessmentRequired}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-sm font-medium text-white/90">
                    Risk Assessment Required
                  </span>
                </label>

                {form.riskAssessmentRequired && (
                  <div>
                    <label
                      htmlFor="riskLevel"
                      className="block text-sm font-medium text-white/90 mb-2"
                    >
                      Risk Level <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="riskLevel"
                      name="riskLevel"
                      value={form.riskLevel}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      required={form.riskAssessmentRequired}
                    >
                      <option value="">Select risk level</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="reviewerComments"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  Reviewer Comments
                </label>
                <textarea
                  id="reviewerComments"
                  name="reviewerComments"
                  value={form.reviewerComments}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Reviewer comments..."
                />
              </div>
            </div>
          </section>

          {/* Training */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">
              Training
            </h2>

            <div className="space-y-4">
              <label
                htmlFor="trainingRequired"
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="trainingRequired"
                  name="trainingRequired"
                  checked={form.trainingRequired}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-white/90">
                  Training Required
                </span>
              </label>

              {form.trainingRequired && (
                <div>
                  <label
                    htmlFor="trainingDetails"
                    className="block text-sm font-medium text-white/90 mb-2"
                  >
                    Training Details
                  </label>
                  <textarea
                    id="trainingDetails"
                    name="trainingDetails"
                    value={form.trainingDetails}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Describe training requirements..."
                  />
                </div>
              )}
            </div>
          </section>

          {/* Document Control */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-3">
              Document Control
            </h2>

            <div className="space-y-4">
              <label
                htmlFor="documentChangeRequired"
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="documentChangeRequired"
                  name="documentChangeRequired"
                  checked={form.documentChangeRequired}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-white/90">
                  Document Change Required
                </span>
              </label>

              {form.documentChangeRequired && (
                <div>
                  <label
                    htmlFor="dcrNumber"
                    className="block text-sm font-medium text-white/90 mb-2"
                  >
                    DCR Number
                  </label>
                  <input
                    id="dcrNumber"
                    type="text"
                    name="dcrNumber"
                    value={form.dcrNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="Enter DCR number..."
                  />
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || submitting}
              className="px-6 py-3 rounded-lg border border-white/20 bg-white/5 text-white font-medium hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || saving}
              className="px-6 py-3 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
