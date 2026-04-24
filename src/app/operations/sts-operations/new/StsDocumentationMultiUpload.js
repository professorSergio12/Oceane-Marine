"use client";

import { useRef, useState, useCallback } from "react";

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png";

function CloudUploadIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.25}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
      />
    </svg>
  );
}

function syncNamesFromInput(input) {
  if (!input?.files?.length) return [];
  return Array.from(input.files, (f) => f.name);
}

function mergeFilesIntoInput(input, newFiles) {
  if (!input) return;
  const dt = new DataTransfer();
  if (input.files?.length) {
    for (const f of input.files) {
      dt.items.add(f);
    }
  }
  for (const file of newFiles) {
    if (file && file.size > 0) dt.items.add(file);
  }
  input.files = dt.files;
}

/**
 * Multiple optional file attachments for STS Documentation (field name: documentationFiles).
 * @param {{ existingDocuments?: Array<{ documentType?: string; filePath: string; source?: string }> }} props
 */
export default function StsDocumentationMultiUpload({ existingDocuments = [] }) {
  const inputRef = useRef(null);
  /** Files already on the input before opening the file dialog (so "+ Add Files" stays additive). */
  const preservedBeforePickerRef = useRef([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = useCallback(() => {
    const input = inputRef.current;
    preservedBeforePickerRef.current = input?.files?.length
      ? Array.from(input.files)
      : [];
    input?.click();
  }, []);

  const refreshFromInput = useCallback(() => {
    setSelectedNames(syncNamesFromInput(inputRef.current));
  }, []);

  const onInputChange = useCallback(() => {
    const input = inputRef.current;
    const incoming = Array.from(input?.files || []);
    const prior = preservedBeforePickerRef.current;
    preservedBeforePickerRef.current = [];

    if (!input) return;

    if (!incoming.length && !prior.length) {
      setSelectedNames([]);
      return;
    }

    const dt = new DataTransfer();
    for (const f of prior) dt.items.add(f);
    for (const f of incoming) dt.items.add(f);
    input.files = dt.files;
    setSelectedNames(syncNamesFromInput(input));
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer?.files || []);
      if (!dropped.length) return;
      mergeFilesIntoInput(inputRef.current, dropped);
      refreshFromInput();
    },
    [refreshFromInput]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const clear = useCallback(() => {
    const input = inputRef.current;
    if (input) {
      input.value = "";
      const dt = new DataTransfer();
      input.files = dt.files;
    }
    setSelectedNames([]);
  }, []);

  const manualExisting = (existingDocuments || []).filter(
    (d) => d?.filePath && d.source === "MANUAL_UPLOAD"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-white">Attachments</h3>
        <button
          type="button"
          onClick={openPicker}
          className="shrink-0 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 transition"
        >
          + Add Files
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        name="documentationFiles"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={onInputChange}
      />

      <button
        type="button"
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
          isDragging
            ? "border-orange-400/60 bg-orange-500/10"
            : "border-white/25 bg-white/2 hover:border-white/35 hover:bg-white/4"
        }`}
      >
        <CloudUploadIcon className="mb-4 h-12 w-12 text-slate-400" />
        <p className="text-center text-sm text-white">
          Click &quot;+ Add Files&quot; to attach documents
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
        </p>
      </button>

      {selectedNames.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/3 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ready to upload ({selectedNames.length})
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline"
            >
              Clear all
            </button>
          </div>
          <ul className="max-h-36 space-y-1 overflow-y-auto text-sm text-slate-300">
            {selectedNames.map((name, idx) => (
              <li key={`${name}-${idx}`} className="truncate pl-1">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {manualExisting.length > 0 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/3 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Previously uploaded ({manualExisting.length})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {manualExisting.map((doc, i) => {
              const name =
                doc.documentType || doc.filePath?.split("/").pop() || "attachment";
              const ext = (name.split(".").pop() || "").toLowerCase();
              const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
                ext
              );
              return (
                <a
                  key={`${doc.filePath}-${i}`}
                  href={doc.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={name}
                  className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 hover:border-sky-400/40 hover:bg-white/10 transition"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.filePath}
                      alt={name}
                      className="h-20 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-20 items-center justify-center bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                      {ext || "file"}
                    </div>
                  )}
                  <div className="px-2 py-1.5">
                    <p className="truncate text-[11px] text-slate-200">{name}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
