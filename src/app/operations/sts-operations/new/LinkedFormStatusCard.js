"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HARDCOPY_DOC_PREFIX } from "@/lib/utils/sts-linked-form-file";
import { downloadFileFromUrl, downloadFilesAsZip } from "@/lib/utils/sts-file-download";
import { confirmDialog } from "@/app/components/ConfirmDialog";

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
  onRemoveAttachment,
  onReplaceAttachment,
  removingPath,
  busy: pageBusy,
}) {
  // Any upload/remove running on the page locks the attachment buttons
  const busy = Boolean(pageBusy || uploading || removingPath);
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [zipState, setZipState] = useState(null); // null | "working" | error message
  const menuRef = useRef(null);
  const manageRef = useRef(null);

  useEffect(() => {
    if (!menuOpen && !manageOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (manageRef.current && !manageRef.current.contains(e.target)) setManageOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen, manageOpen]);

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
          {canUpload && onRemoveAttachment && attachmentCount > 0 && (
            <div ref={manageRef} className="relative flex flex-1">
              <button
                type="button"
                onClick={() => setManageOpen((open) => !open)}
                aria-expanded={manageOpen}
                className={`${footerButton} border-amber-400/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}
                title="See, remove or replace the uploaded files"
              >
                Attachments ({attachmentCount})
              </button>
              {manageOpen && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[80vw] overflow-hidden rounded-lg border border-white/15 bg-slate-900 shadow-xl">
                  <p className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                    Uploaded files · replace or remove a wrong file
                  </p>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {uploadedDocs.map((doc) => {
                      const removable = doc.source === "CHECKLIST_HARDCOPY";
                      const removing = removingPath === doc.filePath;
                      return (
                        <li key={doc.filePath} className="flex items-center gap-3 px-3 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium text-white" title={displayFileName(doc.filePath)}>
                              {displayFileName(doc.filePath)}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {doc.uploadedAt ? `Uploaded · ${formatDateOnly(doc.uploadedAt)}` : "Uploaded"}
                            </span>
                          </span>
                          {removable ? (
                            <span className="flex flex-shrink-0 gap-1">
                              {onReplaceAttachment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManageOpen(false);
                                    onReplaceAttachment(f.formCode, doc);
                                  }}
                                  disabled={busy}
                                  className="rounded-md border border-white/20 px-2 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Upload a new file in place of this one"
                                >
                                  Replace
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onRemoveAttachment(f.formCode, doc)}
                                disabled={busy}
                                className="rounded-md border border-red-400/40 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removing ? "Removing…" : "Remove"}
                              </button>
                            </span>
                          ) : (
                            <span className="flex-shrink-0 text-[10px] text-white/40" title="Added through the documentation file upload">
                              Documentation file
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
          {canUpload && (
            <button
              type="button"
              onClick={() =>
                onUpload(f.formCode, {
                  multiple: allowMultiple,
                  existingNames: uploadedDocs.map((d) => displayFileName(d.filePath)),
                })
              }
              disabled={busy}
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

/** Largest file the upload route accepts (MAX_BYTES in the checklist-hardcopy route). */
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
const MAX_UPLOAD_LABEL = "1 GB";
const HARDCOPY_API = "/api/operations/sts/checklist-hardcopy";
/** Files uploaded at the same time when several are picked. */
const PARALLEL_UPLOADS = 3;

function formatSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Send the file as the raw request body (the server streams it to disk) and report
 * progress through `onProgress(sentBytes)`. XMLHttpRequest because fetch has no upload progress.
 */
function postHardcopy(ref, formTarget, file, onProgress) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ operationRef: ref, formTarget, fileName: file.name });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${HARDCOPY_API}?${params.toString()}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded);
    xhr.onload = () => {
      let json = {};
      try {
        json = JSON.parse(xhr.responseText || "{}");
      } catch {
        // non-JSON error page (e.g. from the proxy)
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.success) resolve(json);
      else if (xhr.status === 413) reject(new Error(json.error || `File too large (max ${MAX_UPLOAD_LABEL})`));
      else reject(new Error(json.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error: the connection was lost during the upload"));
    xhr.ontimeout = () => reject(new Error("The upload timed out"));
    xhr.send(file);
  });
}

async function sendJson(method, body) {
  const res = await fetch(HARDCOPY_API, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/** Reason a file cannot be uploaded, checked before sending it; null when it is fine. */
function preUploadProblem(file) {
  if (!file.size) return "The file is empty";
  if (file.size > MAX_UPLOAD_BYTES) return `Too large (${formatSize(file.size)}, max ${MAX_UPLOAD_LABEL})`;
  return null;
}

/**
 * Hardcopy attachments for linked form cards: upload (one or many), replace, remove and undo.
 * Render `fileInput` and `notice` once on the page and pass the rest to the cards;
 * `onUploaded` reloads the documents after every change.
 * `notice` is a fixed panel that tracks each file while uploading and confirms the result.
 */
export function useHardcopyUpload({ operationRef, onUploaded }) {
  const [uploadingFormCode, setUploadingFormCode] = useState(null);
  const [removingPath, setRemovingPath] = useState(null);
  // { action: "upload" | "replace" | "remove", formTarget, ref, files: [{ name, state, error }], undoDoc }
  const [uploadStatus, setUploadStatus] = useState(null);
  const pendingRef = useRef(null); // { formCode, replaceDoc, existingNames }
  const inputRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const busy = Boolean(uploadingFormCode || removingPath);

  const showStatus = (status, autoHideMs) => {
    clearTimeout(hideTimerRef.current);
    setUploadStatus(status);
    if (autoHideMs) hideTimerRef.current = setTimeout(() => setUploadStatus(null), autoHideMs);
  };

  const openPicker = (pending, multiple) => {
    if (busy || !inputRef.current) return;
    pendingRef.current = pending;
    inputRef.current.multiple = multiple;
    inputRef.current.click();
  };

  /** Upload new files; `existingNames` are the card's current attachments (duplicate check). */
  const triggerUpload = (formCode, { multiple = false, existingNames = [] } = {}) =>
    openPicker({ formCode, existingNames }, multiple);

  /** Upload one file in place of `doc` (the old one is removed only after the new one is saved). */
  const triggerReplace = (formCode, doc) => openPicker({ formCode, replaceDoc: doc, existingNames: [] }, false);

  const setFileState = (index, patch) =>
    setUploadStatus((prev) =>
      prev ? { ...prev, files: prev.files.map((f, i) => (i === index ? { ...f, ...patch } : f)) } : prev
    );

  const handleFilePicked = async (e) => {
    const picked = Array.from(e.target.files || []);
    const pending = pendingRef.current;
    pendingRef.current = null;
    e.target.value = "";
    const ref = String(operationRef || "").trim();
    if (picked.length === 0 || !pending?.formCode || !ref) return;
    const { formCode: formTarget, replaceDoc, existingNames } = pending;

    // Same file name already attached to this form → ask before adding it again
    const existing = new Set((existingNames || []).map((n) => n.toLowerCase()));
    const duplicates = picked.filter((file) => existing.has(file.name.toLowerCase()));
    let skipDuplicates = false;
    if (duplicates.length > 0) {
      const names = duplicates.map((file) => `"${file.name}"`).join(", ");
      const again = await confirmDialog({
        title: duplicates.length === 1 ? "File already attached" : "Files already attached",
        message: `${names} ${duplicates.length === 1 ? "is" : "are"} already attached to ${formTarget}. Upload ${duplicates.length === 1 ? "it" : "them"} again?`,
        confirmLabel: "Upload again",
        cancelLabel: "Skip",
        danger: false,
      });
      skipDuplicates = !again;
      if (skipDuplicates && duplicates.length === picked.length) return;
    }

    const action = replaceDoc ? "replace" : "upload";
    const files = picked.map((file) => {
      if (skipDuplicates && existing.has(file.name.toLowerCase())) {
        return { name: file.name, state: "skipped", error: "Already attached" };
      }
      const problem = preUploadProblem(file);
      return problem ? { name: file.name, state: "failed", error: problem } : { name: file.name, size: file.size, sent: 0, state: "waiting" };
    });
    setUploadingFormCode(formTarget);
    showStatus({ action, formTarget, ref, files });

    let saved = 0;
    // One request per file, up to PARALLEL_UPLOADS at a time; keep going if one fails
    const queue = picked.map((_, i) => i).filter((i) => files[i].state === "waiting");
    const worker = async () => {
      while (queue.length > 0) {
        const i = queue.shift();
        setFileState(i, { state: "uploading", sent: 0 });
        try {
          await postHardcopy(ref, formTarget, picked[i], (sent) => setFileState(i, { sent }));
          saved += 1;
          setFileState(i, { state: "saved", sent: picked[i].size });
        } catch (err) {
          setFileState(i, { state: "failed", error: err.message });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, queue.length) }, worker));

    let replaceError = null;
    if (replaceDoc && saved === 1) {
      try {
        await sendJson("DELETE", { operationRef: ref, filePath: replaceDoc.filePath });
      } catch (err) {
        replaceError = `New file attached, but the old one was not removed: ${err.message}`;
      }
    }

    try {
      if (saved > 0) await onUploaded?.();
    } finally {
      setUploadingFormCode(null);
    }

    const attempted = files.filter((f) => f.state !== "skipped").length;
    if (replaceError) {
      setUploadStatus((prev) => (prev ? { ...prev, error: replaceError } : prev));
    } else if (saved === attempted) {
      // Everything went through: close on its own; any failure stays until dismissed
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setUploadStatus(null), 6000);
    }
  };

  /** Remove one uploaded hardcopy after confirmation; the panel offers Undo. */
  const removeAttachment = async (formCode, doc) => {
    const ref = String(operationRef || "").trim();
    const name = displayFileName(doc?.filePath);
    if (busy || !ref || !doc?.filePath) return;
    const ok = await confirmDialog({
      title: "Remove attachment?",
      message: `"${name}" will be removed from ${formCode} on job ${ref}. You can undo this straight after, or upload the correct file.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;

    setRemovingPath(doc.filePath);
    try {
      const json = await sendJson("DELETE", { operationRef: ref, filePath: doc.filePath });
      await onUploaded?.();
      showStatus(
        { action: "remove", formTarget: formCode, ref, files: [{ name, state: "saved" }], undoDoc: json.data || doc },
        10000
      );
    } catch (err) {
      showStatus({ action: "remove", formTarget: formCode, ref, files: [{ name, state: "failed", error: err.message }] });
    } finally {
      setRemovingPath(null);
    }
  };

  const undoRemove = async () => {
    const status = uploadStatus;
    if (!status?.undoDoc) return;
    clearTimeout(hideTimerRef.current);
    setUploadStatus({ ...status, undoing: true });
    try {
      await sendJson("PUT", { operationRef: status.ref, document: status.undoDoc });
      await onUploaded?.();
      showStatus({ ...status, action: "restore", undoDoc: null, undoing: false }, 5000);
    } catch (err) {
      setUploadStatus({ ...status, undoing: false, error: `Undo failed: ${err.message}` });
    }
  };

  const fileInput = (
    <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={handleFilePicked} />
  );

  let notice = null;
  if (uploadStatus) {
    const { action, files, formTarget, ref, undoDoc, undoing, error } = uploadStatus;
    const total = files.length;
    const settled = files.filter((f) => f.state !== "waiting" && f.state !== "uploading").length;
    const savedCount = files.filter((f) => f.state === "saved").length;
    const problems = files.filter((f) => f.state === "failed" || f.state === "skipped");
    const failed = problems.some((f) => f.state === "failed") || Boolean(error);
    const inProgress = settled < total || undoing;
    const plural = (n) => `${n} file${n === 1 ? "" : "s"}`;
    // Overall progress across the files being uploaded (by bytes)
    const uploadable = files.filter((f) => f.size);
    const totalBytes = uploadable.reduce((sum, f) => sum + f.size, 0);
    const sentBytes = uploadable.reduce((sum, f) => sum + Math.min(f.sent || 0, f.size), 0);
    const percent = totalBytes ? Math.floor((sentBytes / totalBytes) * 100) : 0;

    let message;
    if (undoing) message = "Restoring…";
    else if (action === "remove") message = failed ? "Could not remove the file" : `Removed "${files[0].name}"`;
    else if (action === "restore") message = `Restored "${files[0].name}"`;
    else if (inProgress) {
      message = `Uploading ${plural(uploadable.length)}… ${percent}% (${formatSize(sentBytes)} of ${formatSize(totalBytes)})`;
    }
    else if (action === "replace") message = savedCount && !error ? "File replaced" : "File not replaced";
    else if (savedCount === 0) message = "Nothing was uploaded";
    else message = `${plural(savedCount)} attached`;

    let tone = "border-emerald-400/50 text-emerald-100";
    if (inProgress) tone = "border-sky-400/50 text-sky-100";
    else if (failed) tone = "border-red-400/50 text-red-100";

    notice = (
      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 top-4 z-[9999] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border bg-slate-900 px-4 py-3 shadow-2xl ${tone}`}
      >
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{message}</span>
            <span className="text-white/50"> · {formTarget} · job {ref}</span>
          </p>
          {action === "remove" && undoDoc && !undoing && (
            <button
              type="button"
              onClick={undoRemove}
              className="text-xs font-semibold text-sky-300 underline-offset-2 hover:underline"
            >
              Undo
            </button>
          )}
          {!inProgress && (
            <button
              type="button"
              onClick={() => setUploadStatus(null)}
              aria-label="Close"
              className="text-xs font-semibold text-white/50 hover:text-white"
            >
              Close
            </button>
          )}
        </div>
        {(problems.length > 0 || error) && !inProgress && (
          <ul className="mt-2 space-y-0.5 text-xs text-red-200/90">
            {problems.map((f, i) => (
              <li key={`${f.name}-${i}`} className="truncate" title={`${f.name}: ${f.error}`}>
                {f.name}: {f.error}
              </li>
            ))}
            {error && <li>{error}</li>}
          </ul>
        )}
      </div>
    );
    // Render on <body>: inside the page's blurred panels `position: fixed` sticks to the panel
    // instead of the screen, so the user would have to scroll to see it.
    if (typeof document !== "undefined") notice = createPortal(notice, document.body);
  }

  return {
    fileInput,
    notice,
    uploadingFormCode,
    triggerUpload,
    triggerReplace,
    removeAttachment,
    removingPath,
    busy,
  };
}
