/**
 * Storage layer for SharePoint files. Files are saved on the server disk under
 * uploads/sharepoint and served by the existing /api/files/download route;
 * MongoDB stores only the key/url, never the file bytes.
 *
 * (DigitalOcean Spaces support was removed — not in use. To add an object-store
 * driver later, branch saveFile()/fileExists() on STORAGE_DRIVER again.)
 */
import { saveToLocal, localExists } from "./localStorage.js";

export const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();

/**
 * Build a key that MIRRORS the SharePoint folder structure under a prefix.
 *   buildMirrorKey("HR/Oil-Majors", "Shell/2024", "audit.pdf")
 *     -> "HR/Oil-Majors/Shell/2024/audit.pdf"
 * Preserves the exact SharePoint organization (year folders, name folders).
 */
export const buildMirrorKey = (keyPrefix, relativePath, fileName) => {
  const segments = [];
  if (keyPrefix) segments.push(keyPrefix); // may contain slashes — keep as-is
  if (relativePath) {
    for (const part of relativePath.split("/")) {
      const clean = sanitizeSegment(part);
      if (clean) segments.push(clean);
    }
  }
  segments.push(sanitizeFileName(fileName));
  return segments.join("/");
};

/**
 * Insert a short unique suffix before the file extension. Used when two
 * different SharePoint files sanitize to the SAME key (names differing only by
 * spaces/dashes) — keeps both instead of one overwriting the other.
 *   disambiguateKey("a/b/file.docx", "X9K2") -> "a/b/file-X9K2.docx"
 */
export const disambiguateKey = (key, suffix) => {
  const slash = key.lastIndexOf("/");
  const dot = key.lastIndexOf(".");
  if (dot > slash + 1) return `${key.slice(0, dot)}-${suffix}${key.slice(dot)}`;
  return `${key}-${suffix}`;
};

/** Save a file (stream/Buffer) to local disk and return { key, url }. */
export const saveFile = async ({ key, body }) => saveToLocal({ key, body });

/** Check if a file already exists in storage. */
export const fileExists = async (key) => localExists(key);

/** Replace anything unsafe in a path segment with a hyphen, collapse repeats. */
const sanitizeSegment = (value) =>
  String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Keep the extension, sanitize the rest of the file name. */
const sanitizeFileName = (name) =>
  String(name)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
