"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Per-module "Sync from SharePoint" button.
 *
 * Click -> queues a background job (API), then polls status every 3s and shows
 * live progress (uploaded / total). The heavy work runs in the worker, so this
 * is safe even for thousands of files.
 *
 * Usage:  <SharepointSyncButton moduleKey="hr" label="HR" onDone={reload} />
 *
 * onDone fires once each time a sync finishes (status -> "done"), so the
 * surrounding file browser can reload itself with the freshly-synced files.
 */
export default function SharepointSyncButton({ moduleKey, label, onDone }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);
  const wasActiveRef = useRef(false);

  const isActive = status?.status === "running" || status?.status === "queued";

  // Fire onDone exactly once when a sync transitions active -> done.
  useEffect(() => {
    if (isActive) {
      wasActiveRef.current = true;
    } else if (wasActiveRef.current && status?.status === "done") {
      wasActiveRef.current = false;
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, status?.status]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/sharepoint/sync?moduleKey=${moduleKey}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
    } catch {
      /* ignore transient poll errors */
    }
  };

  // Initial status + cleanup poll on unmount.
  useEffect(() => {
    fetchStatus();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  // Poll while a sync is active.
  useEffect(() => {
    clearInterval(pollRef.current);
    if (isActive) {
      pollRef.current = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const startSync = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/sharepoint/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || "Failed to start sync");
      }
      await fetchStatus();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pct =
    status?.total > 0
      ? Math.round(((status.uploaded + status.skipped) / status.total) * 100)
      : 0;

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={startSync}
        disabled={loading || isActive}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isActive ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Syncing {label || moduleKey}…
          </>
        ) : (
          <>⟳ Sync {label || moduleKey} from SharePoint</>
        )}
      </button>

      {status && status.status !== "idle" && (
        <div className="text-xs text-gray-600">
          {isActive && (
            <div className="mt-1 w-56">
              <div className="h-1.5 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span>
                {status.uploaded + status.skipped}/{status.total || "?"} files
                {status.currentFolder ? ` · ${status.currentFolder}` : ""}
              </span>
            </div>
          )}

          {status.status === "done" && (
            <span className="text-green-700">
              ✓ Done — {status.uploaded} added, {status.skipped} skipped
              {status.failed ? `, ${status.failed} failed` : ""}
              {status.finishedAt
                ? ` · ${new Date(status.finishedAt).toLocaleString()}`
                : ""}
            </span>
          )}

          {status.status === "error" && (
            <span className="text-red-600">✗ Error: {status.error}</span>
          )}
        </div>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}