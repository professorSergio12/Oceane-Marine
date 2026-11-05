"use client";

import { useEffect, useRef, useState } from "react";
import { HARDCOPY_DOC_PREFIX } from "@/lib/utils/sts-linked-form-file";
import { downloadFileFromUrl, downloadFilesAsZip } from "@/lib/utils/sts-file-download";

/**
 * Linked form card (Linked Forms Status) shared by the operation view, edit and new pages:
 * form status, Download (newest file first, generated or uploaded) and a hardcopy Upload.
 */

/** Cards that accept several uploaded files at once (the Checklists section). */
const MULTI_UPLOAD_CATEGORIES = new Set(["checklist"]);

function formatDateOnly(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Original file name, without the "<timestamp>-<uuid>-" prefix added on upload. */
function displayFileName(path) {
  const name = String(path || "").split("/").pop() || "file";
  return name.replace(/^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

/** MANUAL_UPLOAD rows that belong on a linked-form card (by documentType). */
export function findManualUploadDocForLinkedForm(documents, formCode) {
  if (!documents?.length || !formCode) return null;
  const aliases = new Set([formCode]);
  if (formCode === "OPS-OFD-001-A") aliases.add("OPS-OFD-001A");
  const norm = (s) => String(s || "").replace(/-/g, "").toUpperCase();
  const targetNorm = norm(formCode);
  const manual = documents.filter((d) => d?.source === "MANUAL_UPLOAD" && d?.filePath);
  return (
    manual.find((d) => aliases.has(d.documentType)) ||
    manual.find((d) => norm(d.documentType) === targetNorm) ||
    null
  );
}

/** All hardcopies uploaded for a form, newest first. */
function getHardcopyDocsForForm(documents, formCode) {
  if (!documents?.length || !formCode) return [];
  const keys = new Set([`${HARDCOPY_DOC_PREFIX}${formCode}`]);
  if (formCode === "OPS-OFD-014-B" || formCode === "OPS-OFD-014-A") {
    keys.add(`${HARDCOPY_DOC_PREFIX}OPS-OFD-014`);
  }
  return documents
    .filter((d) => d?.source === "CHECKLIST_HARDCOPY" && d?.filePath && keys.has(d.documentType))
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
}

/** Some jobs save the generated PDF under a shorter code than the linked form card uses. */
const GENERATED_DOC_TYPE_ALIASES = {
  "OPS-OFD-001-A": "OPS-OFD-001A",
  "OPS-OFD-014-A": "OPS-OFD-014",
  "OPS-OFD-014-B": "OPS-OFD-014",
  "OPS-OFD-020-CHS": "OPS-OFD-020",
  "OPS-OFD-020-MS": "OPS-OFD-020",
};
// One code shared by two cards: the PDF is only matched through the record it was generated from
const SHARED_GENERATED_DOC_TYPES = new Set(["OPS-OFD-014", "OPS-OFD-020"]);

/** Generated PDF entry (operation.documents) for a linked form card, or null. */
export function findGeneratedDocForLinkedForm(documents, form) {
  const types = new Set([form.formCode, GENERATED_DOC_TYPE_ALIASES[form.formCode]].filter(Boolean));
  const list = (documents || []).filter((d) => d?.filePath && types.has(d.documentType));
  if (!list.length) return null;
  // Prefer the PDF of the card's newest record
  for (const rec of form.docs || []) {
    const match = list.find((d) => d.checklistId != null && String(d.checklistId) === String(rec._id));
    if (match) return match;
  }
  const unshared = list.filter((d) => !SHARED_GENERATED_DOC_TYPES.has(d.documentType));
  return [...unshared].sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))[0] || null;
}

/** View pages show only Download (showDownload, no canUpload); edit pages only Upload (showDownload={false}). */
export default function LinkedFormStatusCard({
  form: f,
  documents,
  showDownload = true,
  canUpload,
  uploading,
  onUpload,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [zipState, setZipState] = useState(null); // null | "working" | error message
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const latest = f.docs?.[0];
  const hasDigitalRow = Boolean(f.filled && latest);
  const digitalEntry = hasDigitalRow ? findGeneratedDocForLinkedForm(documents, f) : null;
  const digitalPath = digitalEntry?.filePath || null;

  // Uploaded attachments: every hardcopy for this form plus a matching manual upload
  const manualDoc = findManualUploadDocForLinkedForm(documents, f.formCode);
  const uploadedDocs = [...getHardcopyDocsForForm(documents, f.formCode), manualDoc]
    .filter(Boolean)
    .filter((d, i, all) => all.findIndex((x) => x.filePath === d.filePath) === i)
    .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
  const attachmentCount = uploadedDocs.length;

  // Every downloadable file, newest first. The generated file's entry is replaced on every
  // form save, so its uploadedAt is the last save.
  const files = [
    digitalPath && { path: digitalPath, at: digitalEntry?.uploadedAt || latest?.createdAt, kind: "Generated" },
    ...uploadedDocs.map((d) => ({ path: d.filePath, at: d.uploadedAt, kind: "Uploaded" })),
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  const latestFile = files[0] || null;

  const manualOnly = !hasDigitalRow && attachmentCount > 0;
  const pillText = f.filled ? `Filled (${f.count})` : manualOnly ? "Manual" : "Pending";
  const pillClass = f.filled
    ? "bg-emerald-500/20 text-emerald-300"
    : manualOnly
      ? "bg-amber-500/20 text-amber-200"
      : "bg-slate-500/20 text-slate-400";

  const borderClass = f.filled
    ? "border-emerald-500/30 bg-emerald-900/10"
    : manualOnly
      ? "border-amber-500/35 bg-amber-900/10"
      : "border-white/10 bg-white/5";

  const downloadIcon = (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
  const uploadIcon = (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );

  const downloadFile = (file) =>
    downloadFileFromUrl(file.path, `${f.formCode || "form"}-${displayFileName(file.path)}`);
  const downloadAll = async () => {
    setZipState("working");
    try {
      const { failed } = await downloadFilesAsZip(
        files.map((file) => ({ url: file.path, name: displayFileName(file.path) })),
        `${f.formCode || "form"}-files.zip`
      );
      setZipState(failed.length ? `File not found on the server, not included: ${failed.join(", ")}` : null);
    } catch {
      setZipState("Could not prepare the zip. Download the files one by one.");
    }
  };
  const handleDownloadClick = () => {
    if (files.length === 1) downloadFile(files[0]);
    else setMenuOpen((open) => !open);
  };

  const statusText = hasDigitalRow ? latest.status : manualOnly ? "MANUAL" : null;
  const statusClass =
    statusText === "SUBMITTED" || statusText === "APPROVED"
      ? "text-emerald-300"
      : "text-amber-300";
  const dateValue = hasDigitalRow ? latest.createdAt : manualOnly ? uploadedDocs[0]?.uploadedAt : null;

  const detailRow = (label, value) => (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/45">{label}</dt>
      <dd className="text-right font-medium text-white/85 truncate">{value}</dd>
    </div>
  );

  const footerButton =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45";
  const allowMultiple = MULTI_UPLOAD_CATEGORIES.has(f.category);
  const showDownloadButton = showDownload && files.length > 0;

  return (
    <div className={`flex h-full flex-col rounded-xl border p-4 transition-all ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-orange-300 truncate">{f.formCode}</p>
          <p className="text-sm font-semibold text-white truncate" title={f.label}>{f.label}</p>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${pillClass}`}>
          {pillText}
        </span>
      </div>

      {statusText ? (
        <dl className="mt-3 mb-3 space-y-1.5 text-[11px]">
          {hasDigitalRow &&
            detailRow("Seq", <span className="font-mono text-sky-300">{latest.sequenceNumber || "—"}</span>)}
          {detailRow("Status", <span className={statusClass}>{statusText}</span>)}
          {detailRow("Date", dateValue ? formatDateOnly(dateValue) : "—")}
          {detailRow(
            "File",
            latestFile ? (
              <span className="text-emerald-400">
                {latestFile.kind}
                {latestFile.at ? ` · ${formatDateOnly(latestFile.at)}` : ""}
              </span>
            ) : (
              <span className="text-white/50">Not generated</span>
            )
          )}
          {attachmentCount > 0 &&
            detailRow("Attachments", <span className="text-amber-200">{attachmentCount}</span>)}
        </dl>
      ) : (
        <p className="mt-3 mb-3 text-[11px] text-white/40">Not submitted yet</p>
      )}

      {(showDownloadButton || canUpload) && (
        <div className="mt-auto flex gap-2 border-t border-white/10 pt-3">
          {showDownloadButton && (
            <div ref={menuRef} className="relative flex flex-1">
              <button
                type="button"
                onClick={handleDownloadClick}
                aria-expanded={files.length > 1 ? menuOpen : undefined}
                className={`${footerButton} border-orange-400/40 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25`}
                title={files.length > 1 ? "Choose a file to download" : `Download the ${latestFile.kind.toLowerCase()} file`}
              >
                {downloadIcon}
                {files.length > 1 ? `Download (${files.length})` : "Download"}
              </button>
              {menuOpen && files.length > 1 && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[80vw] overflow-hidden rounded-lg border border-white/15 bg-slate-900 shadow-xl">
                  <p className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    {files.length} files · click a file to download it
                  </p>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {files.map((file) => (
                      <li key={file.path}>
                        <button
                          type="button"
                          onClick={() => downloadFile(file)}
                          className="group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/10"
                          title={`Download ${displayFileName(file.path)}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium text-white">
                              {displayFileName(file.path)}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {file.kind}
                              {file.at ? ` · ${formatDateOnly(file.at)}` : ""}
                            </span>
                          </span>
                          <span className="flex-shrink-0 rounded-md border border-orange-400/40 px-2 py-1 text-orange-200 group-hover:bg-orange-500/20">
                            {downloadIcon}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/10 p-2">
                    <button
                      type="button"
                      onClick={downloadAll}
                      disabled={zipState === "working"}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-orange-500/20 px-3 py-2 text-[11px] font-semibold text-orange-100 hover:bg-orange-500/30 disabled:cursor-wait disabled:opacity-60"
                    >
                      {downloadIcon}
                      {zipState === "working" ? "Preparing zip…" : `Download all (${files.length}) as .zip`}
                    </button>
                    {zipState && zipState !== "working" && (
                      <p className="mt-1.5 text-[10px] text-red-300">{zipState}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {canUpload && (
            <button
              type="button"
              onClick={() => onUpload(f.formCode, { multiple: allowMultiple })}
              disabled={uploading}
              className={`${footerButton} border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10`}
              title={allowMultiple ? "Attach one or more scanned or saved files for this form" : "Attach a scanned or saved file for this form"}
            >
              {uploadIcon}
              {uploading ? "Uploading…" : allowMultiple ? "Upload files" : "Upload"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hardcopy upload for linked form cards. Render `fileInput` and `notice` once on the page,
 * pass `uploadingFormCode` / `triggerUpload` to the cards; `onUploaded` reloads the documents.
 */
/**
 * Hardcopy upload for linked form cards. Render `fileInput` and `notice` once on the page,
 * pass `uploadingFormCode` / `triggerUpload` to the cards; `onUploaded` reloads the documents.
 * `notice` is a fixed panel that tracks each file while uploading and confirms what was saved.
 */
export function useHardcopyUpload({ operationRef, onUploaded }) {
  const [uploadingFormCode, setUploadingFormCode] = useState(null);
  // { formTarget, ref, files: [{ name, state: "waiting" | "uploading" | "saved" | "failed", error }] }
  const [uploadStatus, setUploadStatus] = useState(null);
  const pendingFormRef = useRef(null);
  const inputRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const triggerUpload = (formCode, { multiple = false } = {}) => {
    pendingFormRef.current = formCode;
    if (inputRef.current) {
      inputRef.current.multiple = multiple;
      inputRef.current.click();
    }
  };

  const setFileState = (index, patch) =>
    setUploadStatus((prev) =>
      prev ? { ...prev, files: prev.files.map((f, i) => (i === index ? { ...f, ...patch } : f)) } : prev
    );

  const handleFilePicked = async (e) => {
    const picked = Array.from(e.target.files || []);
    const formTarget = pendingFormRef.current;
    pendingFormRef.current = null;
    e.target.value = "";
    const ref = String(operationRef || "").trim();
    if (picked.length === 0 || !formTarget || !ref) return;

    clearTimeout(hideTimerRef.current);
    setUploadingFormCode(formTarget);
    setUploadStatus({ formTarget, ref, files: picked.map((file) => ({ name: file.name, state: "waiting" })) });

    let saved = 0;
    // One request per file (the endpoint takes one file); keep going if one fails
    for (let i = 0; i < picked.length; i += 1) {
      setFileState(i, { state: "uploading" });
      try {
        const fd = new FormData();
        fd.set("operationRef", ref);
        fd.set("formTarget", formTarget);
        fd.set("file", picked[i]);
        const res = await fetch("/api/operations/sts/checklist-hardcopy", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");
        saved += 1;
        setFileState(i, { state: "saved" });
      } catch (err) {
        setFileState(i, { state: "failed", error: err.message || "Upload failed" });
      }
    }
    try {
      if (saved > 0) await onUploaded?.();
    } finally {
      setUploadingFormCode(null);
    }
    // All saved: close on its own; any failure stays until dismissed
    if (saved === picked.length) {
      hideTimerRef.current = setTimeout(() => setUploadStatus(null), 6000);
    }
  };

  const fileInput = (
    <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={handleFilePicked} />
  );

  let notice = null;
  if (uploadStatus) {
    const { files, formTarget, ref } = uploadStatus;
    const total = files.length;
    const finished = files.filter((f) => f.state === "saved" || f.state === "failed").length;
    const savedCount = files.filter((f) => f.state === "saved").length;
    const failedCount = files.filter((f) => f.state === "failed").length;
    const inProgress = finished < total;
    const title = inProgress
      ? `Uploading ${Math.min(finished + 1, total)} of ${total} file${total === 1 ? "" : "s"}…`
      : failedCount === 0
        ? `${savedCount} file${savedCount === 1 ? "" : "s"} attached`
        : `${savedCount} of ${total} file${total === 1 ? "" : "s"} attached`;
    const accent = inProgress ? "border-sky-400/40" : failedCount ? "border-red-400/50" : "border-emerald-400/50";
    const stateLabel = {
      waiting: { text: "Waiting", cls: "text-white/40" },
      uploading: { text: "Uploading…", cls: "text-sky-300" },
      saved: { text: "Attached", cls: "text-emerald-300" },
      failed: { text: "Failed", cls: "text-red-300" },
    };

    notice = (
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-[9999] w-80 max-w-[calc(100vw-2rem)] rounded-xl border ${accent} bg-slate-900/95 p-4 shadow-2xl backdrop-blur`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-[11px] text-white/55">
              {formTarget} · job {ref}
            </p>
          </div>
          {!inProgress && (
            <button
              type="button"
              onClick={() => setUploadStatus(null)}
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white/60 hover:bg-white/10 hover:text-white"
            >
              Dismiss
            </button>
          )}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${failedCount ? "bg-red-400" : "bg-emerald-400"}`}
            style={{ width: `${Math.round((finished / total) * 100)}%` }}
          />
        </div>
        <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-white/85" title={f.name}>{f.name}</span>
                <span className={`flex-shrink-0 font-semibold ${stateLabel[f.state].cls}`}>{stateLabel[f.state].text}</span>
              </div>
              {f.error && <p className="mt-0.5 text-red-300/80">{f.error}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return { fileInput, notice, uploadingFormCode, triggerUpload };
}
