"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TemplateDownloadLink } from "../../../components/TemplateDownloadLink";
import { useSearchParams } from "next/navigation";
import {
  POAC_EVALUATION_ITEMS,
  POAC_INTRO_TEXT,
  POAC_LEVELS_TEXT,
  POAC_OFFICE_START_SR_NO,
  normalizePoacEvaluation,
  poacOptionsForRow,
  poacRemarksRequired,
} from "@/lib/constants/qhse-poac/poacEvaluationItems";
import { resolveQhseSignatureImageSrc } from "@/lib/utils/qhse-signature-url";
import { useQhseSidebar } from "../../../QhseSidebarContext";
import { useQhseRole } from "@/hooks/useQhseRole";

const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

/** Saved value for the form; anything unreadable is shown as not rated. */
function savedEvaluation(value) {
  try {
    return normalizePoacEvaluation(value);
  } catch {
    return null;
  }
}

function evaluationItemsPayload(items) {
  return items.map((item) => ({
    srNo: item.srNo,
    evaluation: item.evaluation ?? null,
    remarks: item.remarks?.trim() || "",
  }));
}

/** Signature as an image: upload, preview, replace, remove. */
function SignatureField({ label, value, onChange }) {
  const [problem, setProblem] = useState(null);
  const stored = value?.trim() || "";
  const imageSrc = stored ? resolveQhseSignatureImageSrc(stored) : null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProblem("Please choose an image file (PNG or JPG).");
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      setProblem("The image is too large (max 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProblem(null);
      onChange(reader.result);
    };
    reader.onerror = () => setProblem("The image could not be read. Please try again.");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
        {label}
      </label>
      {stored && (
        <div className="mb-2 flex flex-wrap items-center gap-3">
          {imageSrc ? (
            <img src={imageSrc} alt={label} className="h-16 max-w-[200px] rounded border border-white/15 bg-white object-contain p-1" />
          ) : (
            <p className="text-sm text-slate-200">{stored}</p>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-semibold text-red-300 hover:text-red-200"
          >
            Remove
          </button>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20 file:cursor-pointer"
      />
      {problem && <p className="mt-1 text-xs text-red-400">{problem}</p>}
    </div>
  );
}

export default function PoacCrossCompetencyFormPage() {
  const { contentClassName } = useQhseSidebar();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { canCreate, canEdit, canDelete, canApprove, canDownload, isQhseAdmin } = useQhseRole();
  const canSubmit = editId ? canEdit : canCreate;

  // Initialize evaluation items
  const initialEvaluationItems = POAC_EVALUATION_ITEMS.map((item) => ({
    srNo: item.srNo,
    area: item.area,
    evaluation: null,
    remarks: "",
  }));

  const [form, setForm] = useState({
    // Revision (read-only when present: 1.0 = new, 1.1+ and revDate set by backend on update)
    revNo: "1.0",
    revDate: "",
    approvedBy: "",

    // POAC Details (Required)
    nameOfPOAC: "",
    evaluationDate: "",
    jobRefNo: "",
    leadPOAC: "",

    // Optional Vessel Information
    dischargingVessel: "",
    receivingVessel: "",
    location: "",
    typeOfOperation: "",
    weatherCondition: "",
    deadweightDischarging: "",
    deadweightReceiving: "",

    // Evaluation Items (all 75 items)
    evaluationItems: initialEvaluationItems,

    // Lead POAC Comments & Signatures
    leadPOACComment: "",
    leadPOACName: "",
    leadPOACDate: "",
    leadPOACSignature: "",

    // Operations Support Team Comment
    opsSupportTeamComment: "",

    // Ops Team
    opsTeamName: "",
    opsTeamDate: "",
    opsTeamSignature: "",

    // Ops Team Superintendent
    opsTeamSupdtName: "",
    opsTeamSupdtDate: "",
    opsTeamSupdtSignature: "",

    // Status
    status: "Draft",
  });

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [displayFormCode, setDisplayFormCode] = useState(null);
  const [displaySerialNumber, setDisplaySerialNumber] = useState(null);

  // Load form data if editing
  useEffect(() => {
    if (editId) {
      const loadForm = async () => {
        try {
          const res = await fetch(`/api/qhse/cross-competency/${editId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              const formData = data.data;

              // Merge existing evaluation items with form data
              const mergedEvaluationItems = initialEvaluationItems.map(
                (defaultItem) => {
                  const existingItem = formData.evaluationItems?.find(
                    (item) => item.srNo === defaultItem.srNo
                  );
                  if (existingItem) {
                    return {
                      srNo: defaultItem.srNo,
                      area: defaultItem.area,
                      evaluation: savedEvaluation(existingItem.evaluation),
                      remarks: existingItem.remarks || "",
                    };
                  }
                  return defaultItem;
                }
              );

              setForm({
                revNo: formData.revNo || "1.0",
                revDate: formData.revDate
                  ? new Date(formData.revDate).toISOString().split("T")[0]
                  : "",
                approvedBy: formData.approvedBy || "",
                nameOfPOAC: formData.nameOfPOAC || "",
                evaluationDate: formData.evaluationDate
                  ? new Date(formData.evaluationDate)
                      .toISOString()
                      .split("T")[0]
                  : "",
                jobRefNo: formData.jobRefNo || "",
                leadPOAC: formData.leadPOAC || "",
                dischargingVessel: formData.dischargingVessel || "",
                receivingVessel: formData.receivingVessel || "",
                location: formData.location || "",
                typeOfOperation: formData.typeOfOperation || "",
                weatherCondition: formData.weatherCondition || "",
                deadweightDischarging: formData.deadweightDischarging || "",
                deadweightReceiving: formData.deadweightReceiving || "",
                evaluationItems: mergedEvaluationItems,
                leadPOACComment: formData.leadPOACComment || "",
                leadPOACName: formData.leadPOACName || "",
                leadPOACDate: formData.leadPOACDate
                  ? new Date(formData.leadPOACDate).toISOString().split("T")[0]
                  : "",
                leadPOACSignature: formData.leadPOACSignature || "",
                opsSupportTeamComment: formData.opsSupportTeamComment || "",
                opsTeamName: formData.opsTeamName || "",
                opsTeamDate: formData.opsTeamDate
                  ? new Date(formData.opsTeamDate).toISOString().split("T")[0]
                  : "",
                opsTeamSignature: formData.opsTeamSignature || "",
                opsTeamSupdtName: formData.opsTeamSupdtName || "",
                opsTeamSupdtDate: formData.opsTeamSupdtDate
                  ? new Date(formData.opsTeamSupdtDate)
                      .toISOString()
                      .split("T")[0]
                  : "",
                opsTeamSupdtSignature: formData.opsTeamSupdtSignature || "",
                status: formData.status || "Draft",
              });
              setDisplayFormCode(formData.formCode || null);
              setDisplaySerialNumber(formData.serialNumber || null);
            }
          }
        } catch (err) {
          setError("Failed to load form data");
        }
      };
      loadForm();
    }
  }, [editId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEvaluationChange = (index, field, value) => {
    setForm((prev) => {
      const newItems = [...prev.evaluationItems];
      newItems[index] = {
        ...newItems[index],
        [field]: field === "evaluation" ? value || null : value,
      };
      return { ...prev, evaluationItems: newItems };
    });
    // The remarks rule may no longer apply to this row
    setValidationErrors((prev) => {
      if (!prev[`evaluation_${index}`]) return prev;
      const newErrors = { ...prev };
      delete newErrors[`evaluation_${index}`];
      return newErrors;
    });
  };

  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!form.nameOfPOAC?.trim()) {
      errors.nameOfPOAC = "Name of POAC is required";
    }
    if (!form.evaluationDate) {
      errors.evaluationDate = "Evaluation date is required";
    }
    if (!form.jobRefNo?.trim()) {
      errors.jobRefNo = "Job Ref No is required";
    }
    if (!form.leadPOAC?.trim()) {
      errors.leadPOAC = "Lead POAC is required";
    }

    // Validate evaluation items
    form.evaluationItems.forEach((item, index) => {
      if (poacRemarksRequired(item.evaluation) && !item.remarks?.trim()) {
        errors[
          `evaluation_${index}`
        ] = `Remarks are required for item ${item.srNo} when the answer is No or the rating is below 3`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      // Prepare payload matching API route structure
      const payload = {
        nameOfPOAC: form.nameOfPOAC?.trim() || "",
        evaluationDate: form.evaluationDate || "",
        jobRefNo: form.jobRefNo?.trim() || "",
        leadPOAC: form.leadPOAC?.trim() || "",

        // Optional fields
        ...(form.dischargingVessel?.trim() && {
          dischargingVessel: form.dischargingVessel.trim(),
        }),
        ...(form.receivingVessel?.trim() && {
          receivingVessel: form.receivingVessel.trim(),
        }),
        ...(form.location?.trim() && { location: form.location.trim() }),
        ...(form.typeOfOperation?.trim() && {
          typeOfOperation: form.typeOfOperation.trim(),
        }),
        ...(form.weatherCondition?.trim() && {
          weatherCondition: form.weatherCondition.trim(),
        }),
        ...(form.deadweightDischarging && {
          deadweightDischarging: Number(form.deadweightDischarging),
        }),
        ...(form.deadweightReceiving && {
          deadweightReceiving: Number(form.deadweightReceiving),
        }),

        // Revision: backend sets revNo 1.0 on create; do not send from form

        // Evaluation items - send all 75 items (API will normalize)
        evaluationItems: evaluationItemsPayload(form.evaluationItems),

        // Lead POAC
        ...(form.leadPOACComment?.trim() && {
          leadPOACComment: form.leadPOACComment.trim(),
        }),
        ...(form.leadPOACName?.trim() && {
          leadPOACName: form.leadPOACName.trim(),
        }),
        ...(form.leadPOACDate && { leadPOACDate: form.leadPOACDate }),
        leadPOACSignature: form.leadPOACSignature?.trim() || "",

        // Ops Support
        ...(form.opsSupportTeamComment?.trim() && {
          opsSupportTeamComment: form.opsSupportTeamComment.trim(),
        }),

        // Ops Team
        ...(form.opsTeamName?.trim() && {
          opsTeamName: form.opsTeamName.trim(),
        }),
        ...(form.opsTeamDate && { opsTeamDate: form.opsTeamDate }),
        opsTeamSignature: form.opsTeamSignature?.trim() || "",

        // Superintendent
        ...(form.opsTeamSupdtName?.trim() && {
          opsTeamSupdtName: form.opsTeamSupdtName.trim(),
        }),
        ...(form.opsTeamSupdtDate && {
          opsTeamSupdtDate: form.opsTeamSupdtDate,
        }),
        opsTeamSupdtSignature: form.opsTeamSupdtSignature?.trim() || "",

        status: "Draft",
      };

      const url = editId
        ? `/api/qhse/cross-competency/${editId}/update`
        : "/api/qhse/cross-competency/create";

      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          "Server returned an invalid response. Please try again."
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to save form");
      }

      if (data.data?.formCode) setDisplayFormCode(data.data.formCode);
      if (data.data?.serialNumber) setDisplaySerialNumber(data.data.serialNumber);
      setMessage(
        editId
          ? " Form updated successfully!"
          : " Form saved as draft successfully!"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setValidationErrors({});

    if (!validateForm()) {
      setSubmitting(false);
      setError("Please fix the validation errors before submitting");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      // Prepare payload matching API route structure
      const payload = {
        nameOfPOAC: form.nameOfPOAC.trim(),
        evaluationDate: form.evaluationDate,
        jobRefNo: form.jobRefNo.trim(),
        leadPOAC: form.leadPOAC.trim(),

        // Optional fields
        ...(form.dischargingVessel?.trim() && {
          dischargingVessel: form.dischargingVessel.trim(),
        }),
        ...(form.receivingVessel?.trim() && {
          receivingVessel: form.receivingVessel.trim(),
        }),
        ...(form.location?.trim() && { location: form.location.trim() }),
        ...(form.typeOfOperation?.trim() && {
          typeOfOperation: form.typeOfOperation.trim(),
        }),
        ...(form.weatherCondition?.trim() && {
          weatherCondition: form.weatherCondition.trim(),
        }),
        ...(form.deadweightDischarging && {
          deadweightDischarging: Number(form.deadweightDischarging),
        }),
        ...(form.deadweightReceiving && {
          deadweightReceiving: Number(form.deadweightReceiving),
        }),

        // Revision: backend sets revNo 1.0 on create; do not send from form

        // Evaluation items - send all 75 items (API will normalize)
        evaluationItems: evaluationItemsPayload(form.evaluationItems),

        // Lead POAC
        ...(form.leadPOACComment?.trim() && {
          leadPOACComment: form.leadPOACComment.trim(),
        }),
        ...(form.leadPOACName?.trim() && {
          leadPOACName: form.leadPOACName.trim(),
        }),
        ...(form.leadPOACDate && { leadPOACDate: form.leadPOACDate }),
        leadPOACSignature: form.leadPOACSignature?.trim() || "",

        // Ops Support
        ...(form.opsSupportTeamComment?.trim() && {
          opsSupportTeamComment: form.opsSupportTeamComment.trim(),
        }),

        // Ops Team
        ...(form.opsTeamName?.trim() && {
          opsTeamName: form.opsTeamName.trim(),
        }),
        ...(form.opsTeamDate && { opsTeamDate: form.opsTeamDate }),
        opsTeamSignature: form.opsTeamSignature?.trim() || "",

        // Superintendent
        ...(form.opsTeamSupdtName?.trim() && {
          opsTeamSupdtName: form.opsTeamSupdtName.trim(),
        }),
        ...(form.opsTeamSupdtDate && {
          opsTeamSupdtDate: form.opsTeamSupdtDate,
        }),
        opsTeamSupdtSignature: form.opsTeamSupdtSignature?.trim() || "",

        status: "Submitted",
      };

      const url = editId
        ? `/api/qhse/cross-competency/${editId}/update`
        : "/api/qhse/cross-competency/create";

      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          "Server returned an invalid response. Please try again."
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to submit form");
      }

      if (data.data?.formCode) setDisplayFormCode(data.data.formCode);
      if (data.data?.serialNumber) setDisplaySerialNumber(data.data.serialNumber);
      setMessage("Form submitted successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Redirect to list page after 2 seconds
      setTimeout(() => {
        window.location.href = "/qhse/poac/cross-competency/list";
      }, 2000);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Group evaluation items by category for better organization
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

  const renderEvaluationCategory = (category) => {
    const categoryItems = form.evaluationItems.filter(
      (item) => item.srNo >= category.start && item.srNo <= category.end
    );
    const isOffice = category.start >= POAC_OFFICE_START_SR_NO;

    return (
      <div
        key={category.name}
        className="border border-white/10 rounded-xl p-4 bg-slate-900/20"
      >
        <h3 className="text-sm font-bold text-cyan-300 mb-3">{category.name}</h3>
        <div className="space-y-3">
          {categoryItems.map((item) => {
            const globalIndex = form.evaluationItems.findIndex((e) => e.srNo === item.srNo);
            const errorText = validationErrors[`evaluation_${globalIndex}`];
            const options = poacOptionsForRow(item.srNo);
            // A rating saved before rows 1-71 became Yes / No stays visible until it is changed
            const isOlderValue =
              item.evaluation != null && !options.some((o) => o.value === item.evaluation);
            const remarksRequired = poacRemarksRequired(item.evaluation);

            return (
              <div
                key={item.srNo}
                className="border border-white/5 rounded-lg p-3 bg-slate-900/30"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-slate-300 min-w-[40px]">
                    {item.srNo}.
                  </span>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-slate-200">{item.area}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="sm:w-52">
                        <label className="block text-[10px] uppercase tracking-wide text-slate-300 mb-1">
                          {isOffice ? "Level of Performance" : "Evaluation"}
                        </label>
                        <select
                          className={`w-full rounded-lg bg-slate-900/40 border ${
                            errorText ? "border-red-500" : "border-white/15"
                          } px-2 py-1.5 text-xs text-white`}
                          value={item.evaluation ?? ""}
                          onChange={(e) =>
                            handleEvaluationChange(globalIndex, "evaluation", e.target.value)
                          }
                        >
                          <option value="">Select</option>
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                          {isOlderValue && (
                            <option value={item.evaluation}>
                              {item.evaluation} (earlier rating)
                            </option>
                          )}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wide text-slate-300 mb-1">
                          Remarks {remarksRequired && <span className="text-red-400">*</span>}
                        </label>
                        <textarea
                          className={`w-full rounded-lg bg-slate-900/40 border ${
                            errorText ? "border-red-500" : "border-white/15"
                          } px-2 py-1.5 text-xs text-white`}
                          rows={1}
                          value={item.remarks}
                          onChange={(e) =>
                            handleEvaluationChange(globalIndex, "remarks", e.target.value)
                          }
                          placeholder={remarksRequired ? "Please add your comments" : "Optional"}
                          required={remarksRequired}
                        />
                        {errorText && (
                          <p className="text-[10px] text-red-400 mt-1">{errorText}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`${contentClassName} w-full min-w-0 pr-4`}>
      <div className="mx-auto max-w-[95%] pl-3 sm:pl-4 pr-3 sm:pr-4 py-6 sm:py-6 sm:py-10 space-y-3 sm:space-y-4 sm:space-y-6">
        <header className="mt-12 md:mt-0 mb-2 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-4">
          <Link
            href="/dashboard"
            className="flex-shrink-0 hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold shadow-lg shadow-black/25 backdrop-blur-md transition"
          >
            ← Dashboard
          </Link>
          <div className="flex-1 flex flex-col items-center text-center w-full sm:w-auto">
            <p className="text-xs sm:text-sm uppercase tracking-[0.15em] sm:tracking-[0.25em] text-sky-300">
              QHSE / POAC Cross Competency
            </p>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              {editId
                ? "Edit POAC Cross Competency Form"
                : "POAC Cross Competency "}
            </h1>
          </div>
          <div className="flex w-full max-w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:self-auto sm:flex-shrink-0">
            <TemplateDownloadLink formCode="QAF-OFD-009" />
            <div className="inline-flex max-w-full flex-wrap justify-center rounded-xl border border-white/15 bg-white/5 overflow-hidden">
              <Link
                href="/qhse/poac/cross-competency/form"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                POAC Form
              </Link>
              <Link
                href="/qhse/poac/cross-competency/list"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                POAC List
              </Link>
            </div>
          </div>
        </header>

        {!canSubmit && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-amber-100 text-sm">
            You do not have permission to {editId ? "edit" : "create"} POAC cross competency forms.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {message && (
          <div className="text-base text-emerald-300 bg-emerald-950/40 border-2 border-emerald-500/60 rounded-lg px-6 py-4">
            <span className="font-semibold">{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Revision Information Section */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">
              Revision
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              New forms start at Rev No 1.0. When this document is updated in the main app, Rev No becomes 1.1, 1.2, etc. and Rev Date is set automatically. Approved By is set when the document is approved.
            </p>
            {(form.revNo !== "1.0" || form.revDate || form.approvedBy) && (
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                {form.revNo && (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Rev No</span>
                    <p className="text-sm text-slate-200">{form.revNo}</p>
                  </div>
                )}
                {form.revDate && (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Rev Date</span>
                    <p className="text-sm text-slate-200">{form.revDate}</p>
                  </div>
                )}
                {form.approvedBy && (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-1">Approved By</span>
                    <p className="text-sm text-slate-200">{form.approvedBy}</p>
                  </div>
                )}
              </div>
            )}
            {(displayFormCode || displaySerialNumber) && (
              <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-white/10">
                {displayFormCode && (
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-xs block mb-0.5">Form Code</span>
                    <p className="font-mono font-semibold text-sky-300">{displayFormCode}</p>
                  </div>
                )}
                {displaySerialNumber && (
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider text-xs block mb-0.5">Serial</span>
                    <p className="font-mono font-semibold text-slate-200">{displaySerialNumber}</p>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Note: Form Code and Serial are separate fields and will be auto-generated upon save.
            </p>
          </div>

          {/* POAC Details Section */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-2 text-orange-300">
              POAC Details
            </h2>
            <p className="text-xs text-slate-300 mb-4">{POAC_INTRO_TEXT}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Name of POAC <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full rounded-xl bg-slate-900/40 border ${
                    validationErrors.nameOfPOAC
                      ? "border-red-500"
                      : "border-white/15"
                  } px-3 py-2 text-sm text-white`}
                  value={form.nameOfPOAC}
                  onChange={(e) => handleChange("nameOfPOAC", e.target.value)}
                  required
                />
                {validationErrors.nameOfPOAC && (
                  <p className="text-xs text-red-400 mt-1">
                    {validationErrors.nameOfPOAC}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Evaluation Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full rounded-xl bg-slate-900/40 border ${
                    validationErrors.evaluationDate
                      ? "border-red-500"
                      : "border-white/15"
                  } px-3 py-2 text-sm text-white`}
                  value={form.evaluationDate}
                  onChange={(e) =>
                    handleChange("evaluationDate", e.target.value)
                  }
                  required
                />
                {validationErrors.evaluationDate && (
                  <p className="text-xs text-red-400 mt-1">
                    {validationErrors.evaluationDate}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Job Ref # <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full rounded-xl bg-slate-900/40 border ${
                    validationErrors.jobRefNo
                      ? "border-red-500"
                      : "border-white/15"
                  } px-3 py-2 text-sm text-white`}
                  value={form.jobRefNo}
                  onChange={(e) => handleChange("jobRefNo", e.target.value)}
                  required
                />
                {validationErrors.jobRefNo && (
                  <p className="text-xs text-red-400 mt-1">
                    {validationErrors.jobRefNo}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Lead POAC <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full rounded-xl bg-slate-900/40 border ${
                    validationErrors.leadPOAC
                      ? "border-red-500"
                      : "border-white/15"
                  } px-3 py-2 text-sm text-white`}
                  value={form.leadPOAC}
                  onChange={(e) => handleChange("leadPOAC", e.target.value)}
                  required
                />
                {validationErrors.leadPOAC && (
                  <p className="text-xs text-red-400 mt-1">
                    {validationErrors.leadPOAC}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Discharging Vessel
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.dischargingVessel}
                  onChange={(e) =>
                    handleChange("dischargingVessel", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Receiving Vessel
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.receivingVessel}
                  onChange={(e) =>
                    handleChange("receivingVessel", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Type of Operation
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.typeOfOperation}
                  onChange={(e) =>
                    handleChange("typeOfOperation", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Weather Condition
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.weatherCondition}
                  onChange={(e) =>
                    handleChange("weatherCondition", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Deadweight Discharging (Metric Tonnes)
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.deadweightDischarging}
                  onChange={(e) =>
                    handleChange("deadweightDischarging", e.target.value)
                  }
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Deadweight Receiving (Metric Tonnes)
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  value={form.deadweightReceiving}
                  onChange={(e) =>
                    handleChange("deadweightReceiving", e.target.value)
                  }
                  onWheel={(e) => e.target.blur()}
                />
              </div>
            </div>
          </div>

          {/* Evaluation Items Section */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">
              Evaluation Items
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              Answer Yes or No for each item. Remarks are required for a No.
            </p>

            <div className="space-y-6">
              {evaluationCategories
                .filter((category) => category.start < POAC_OFFICE_START_SR_NO)
                .map(renderEvaluationCategory)}
            </div>
          </div>

          {/* Lead POAC Comments & Signatures */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">
              Lead POAC Comments & Signatures
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                  Lead POAC Comment
                </label>
                <textarea
                  className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                  rows={4}
                  value={form.leadPOACComment}
                  onChange={(e) =>
                    handleChange("leadPOACComment", e.target.value)
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                    Lead POAC Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                    value={form.leadPOACName}
                    onChange={(e) =>
                      handleChange("leadPOACName", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                    Lead POAC Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                    value={form.leadPOACDate}
                    onChange={(e) =>
                      handleChange("leadPOACDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <SignatureField
                label="Lead POAC Signature"
                value={form.leadPOACSignature}
                onChange={(v) => handleChange("leadPOACSignature", v)}
              />
            </div>
          </div>

          {/* Office Requirements (rows 72-75, rated 1-5) */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-2 text-orange-300">
              Level of Performance
            </h2>
            <p className="text-xs text-slate-300 mb-4">{POAC_LEVELS_TEXT}</p>
            <div className="space-y-6">
              {evaluationCategories
                .filter((category) => category.start >= POAC_OFFICE_START_SR_NO)
                .map(renderEvaluationCategory)}
            </div>
          </div>

          {/* Operations Support Team Comment */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">
              Operation & Operations Support Team Comments
            </h2>
            <textarea
              className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
              rows={4}
              value={form.opsSupportTeamComment}
              onChange={(e) =>
                handleChange("opsSupportTeamComment", e.target.value)
              }
            />
          </div>

          {/* Ops Team Signatures */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 backdrop-blur shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-orange-300">
              Operations Team Signatures
            </h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                    Ops Team Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                    value={form.opsTeamName}
                    onChange={(e) =>
                      handleChange("opsTeamName", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                    Ops Team Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                    value={form.opsTeamDate}
                    onChange={(e) =>
                      handleChange("opsTeamDate", e.target.value)
                    }
                  />
                </div>
                <SignatureField
                  label="Ops Team Signature"
                  value={form.opsTeamSignature}
                  onChange={(v) => handleChange("opsTeamSignature", v)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                    Ops Team Superintendent Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                    value={form.opsTeamSupdtName}
                    onChange={(e) =>
                      handleChange("opsTeamSupdtName", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-100 mb-1.5">
                    Ops Team Superintendent Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl bg-slate-900/40 border border-white/15 px-3 py-2 text-sm text-white"
                    value={form.opsTeamSupdtDate}
                    onChange={(e) =>
                      handleChange("opsTeamSupdtDate", e.target.value)
                    }
                  />
                </div>
                <SignatureField
                  label="Ops Team Superintendent Signature"
                  value={form.opsTeamSupdtSignature}
                  onChange={(v) => handleChange("opsTeamSupdtSignature", v)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-full border border-white/20 bg-transparent px-6 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!canSubmit || submitting || saving}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-orange-500 hover:bg-orange-400 px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] shadow disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!canSubmit || submitting || saving}
            >
              {submitting ? "Submitting..." : "Submit Form"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


