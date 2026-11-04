"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * App-wide confirmation dialog — a styled replacement for window.confirm().
 *
 *   if (!(await confirmDialog({ title: "Delete operation?", message: "…" }))) return;
 *
 * <ConfirmDialogHost /> is mounted once in the root layout; confirmDialog() resolves
 * true on Confirm and false on Cancel / Escape / backdrop click.
 */

let openRequest = null;

export function confirmDialog({
  title = "Are you sure?",
  message = "",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
} = {}) {
  const options = { title, message, confirmLabel, cancelLabel, danger };
  // Host not mounted (should not happen) — fall back to the browser dialog
  if (!openRequest) return Promise.resolve(window.confirm(message || title));
  return new Promise((resolve) => openRequest({ ...options, resolve }));
}

export default function ConfirmDialogHost() {
  const [request, setRequest] = useState(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    openRequest = (next) =>
      setRequest((current) => {
        current?.resolve(false); // a newer request replaces an unanswered one
        return next;
      });
    return () => {
      openRequest = null;
    };
  }, []);

  const close = useCallback(
    (result) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request]
  );

  useEffect(() => {
    if (!request) return;
    cancelRef.current?.focus(); // safe default: Enter cancels
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [request, close]);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483647 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => close(false)} />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl shadow-black/50">
        <div className="flex gap-4 p-6">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              request.danger ? "bg-red-500/15 text-red-400" : "bg-orange-500/15 text-orange-400"
            }`}
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div className="min-w-0 pt-1">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-white">
              {request.title}
            </h2>
            {request.message && (
              <p id="confirm-dialog-message" className="mt-1.5 text-sm leading-relaxed text-white/65">
                {request.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 rounded-b-2xl border-t border-white/10 bg-white/[0.03] px-6 py-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => close(false)}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 ${
              request.danger
                ? "bg-red-600 shadow-red-900/40 hover:bg-red-700 focus:ring-red-400/60"
                : "bg-orange-500 shadow-orange-900/40 hover:bg-orange-600 focus:ring-orange-400/60"
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
