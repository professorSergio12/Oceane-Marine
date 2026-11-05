/**
 * Force-download a file in the current tab without navigating away or opening
 * a new tab. Routes through `/api/files/download`, which always responds with
 * `Content-Disposition: attachment`, so browsers download in place regardless
 * of the underlying file's content type or origin.
 *
 * @param {string} url - File URL or `/uploads/...` path served by the app.
 * @param {string} [filename] - Optional suggested filename for the download.
 */
/** Normalize stored paths (e.g. uploads/QHSE/...) to a URL-safe app path (/uploads/...). */
export function normalizeUploadUrl(url) {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return s.startsWith("/") ? s : `/${s}`;
}

export function downloadFileFromUrl(url, filename) {
  if (!url || typeof window === "undefined") return;
  const normalized = normalizeUploadUrl(url);
  const suggestedName = filename || guessFilename(normalized || url);
  const downloadHref = buildDownloadHref(normalized || url, suggestedName);
  if (!downloadHref) {
    window.location.assign(normalized || url);
    return;
  }
  triggerAnchorDownload(downloadHref, suggestedName);
}

/**
 * Open a file URL in a new tab for inline viewing (PDF preview, image, etc.).
 * Use this for "view" / eye-icon buttons.
 *
 * @param {string} url - File URL or `/uploads/...` path served by the app.
 */
export function viewFileInNewTab(url) {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function guessFilename(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    return decodeURIComponent(parsed.pathname.split("/").pop() || "download");
  } catch {
    return url.split("/").pop()?.split("?")[0] || "download";
  }
}

function buildDownloadHref(url, suggestedName) {
  try {
    const params = new URLSearchParams();
    const normalized = normalizeUploadUrl(url);
    const pathOrUrl = normalized || url;
    if (pathOrUrl.startsWith("/")) {
      params.set("path", pathOrUrl);
    } else {
      let parsed;
      try {
        parsed = new URL(pathOrUrl, window.location.origin);
      } catch {
        return null;
      }
      if (parsed.origin === window.location.origin) {
        params.set("path", parsed.pathname + parsed.search);
      } else if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        params.set("url", parsed.toString());
      } else {
        return null;
      }
    }
    if (suggestedName) params.set("name", suggestedName);
    return `/api/files/download?${params.toString()}`;
  } catch {
    return null;
  }
}

function triggerAnchorDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Download several files as one .zip (one browser download instead of one per file).
 * Files that cannot be fetched are skipped and returned in `failed`.
 *
 * @param {{ url: string, name?: string }[]} files
 * @param {string} zipName - e.g. "OPS-OFD-005-2026-552.zip"
 * @returns {Promise<{ added: number, failed: string[] }>}
 */
export async function downloadFilesAsZip(files, zipName) {
  if (typeof window === "undefined" || !files?.length) return { added: 0, failed: [] };
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const usedNames = new Set();
  const failed = [];
  let added = 0;

  for (const file of files) {
    const normalized = normalizeUploadUrl(file.url);
    let name = file.name || guessFilename(normalized || file.url);
    // Keep every file when two share a name: "report.pdf" → "report (2).pdf"
    if (usedNames.has(name.toLowerCase())) {
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      let n = 2;
      while (usedNames.has(`${base} (${n})${ext}`.toLowerCase())) n += 1;
      name = `${base} (${n})${ext}`;
    }
    try {
      const res = await fetch(buildDownloadHref(normalized || file.url, name) || normalized);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      zip.file(name, await res.blob());
      usedNames.add(name.toLowerCase());
      added += 1;
    } catch {
      failed.push(name);
    }
  }

  if (added > 0) {
    const blob = await zip.generateAsync({ type: "blob" });
    const href = URL.createObjectURL(blob);
    triggerAnchorDownload(href, zipName);
    setTimeout(() => URL.revokeObjectURL(href), 10000);
  }
  return { added, failed };
}
