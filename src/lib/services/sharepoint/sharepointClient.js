import { Readable } from "node:stream";
import { getGraphToken } from "./graphAuth.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry transient failures: network blips ("fetch failed", "terminated"),
 * Graph throttling (429) and server errors (5xx). Honours Retry-After.
 * Exponential backoff: ~1s, 2s, 4s, 8s.
 */
export const withRetry = async (fn, label) => {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable =
        err?.retryable ||
        err?.name === "TypeError" || // fetch failed
        /terminated|fetch failed|ECONNRESET|ETIMEDOUT|socket|network|UND_ERR/i.test(
          err?.message || ""
        );
      if (!retryable || attempt === MAX_RETRIES) break;
      const wait = err?.retryAfterMs || 1000 * 2 ** attempt;
      console.warn(`   ↻ retry ${attempt + 1}/${MAX_RETRIES} (${label}) in ${wait}ms — ${err.message}`);
      await sleep(wait);
    }
  }
  throw lastErr;
};

/** Single authenticated GET (no retry) — wrapped by graphGet. */
const graphGetOnce = async (path) => {
  const token = await getGraphToken();
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    const e = new Error(`Graph GET ${url} failed (${res.status}): ${text}`);
    // 429 (throttle) and 5xx are retryable; honour Retry-After.
    if (res.status === 429 || res.status >= 500) {
      e.retryable = true;
      const ra = Number(res.headers.get("retry-after"));
      if (ra) e.retryAfterMs = ra * 1000;
    }
    throw e;
  }
  return res.json();
};

/** Low-level authenticated GET against Graph, with retry. */
const graphGet = (path) => withRetry(() => graphGetOnce(path), `GET ${path}`);

/**
 * Resolve a SharePoint site URL to its Graph site id.
 * Input:  https://oceanemarine.sharepoint.com/sites/Teamsite
 * Calls:  GET /sites/oceanemarine.sharepoint.com:/sites/Teamsite
 */
export const resolveSiteId = async (siteUrl) => {
  const u = new URL(siteUrl);
  const hostname = u.hostname; // oceanemarine.sharepoint.com
  const sitePath = u.pathname; // /sites/Teamsite
  const data = await graphGet(`/sites/${hostname}:${sitePath}`);
  return data.id;
};

/** List the document libraries (drives) of a site. */
export const listDrives = async (siteId) => {
  const data = await graphGet(`/sites/${siteId}/drives`);
  return data.value; // [{ id, name, ... }]
};

/** Find a specific document library by name (e.g. "Oceane Group Filing"). */
export const findDriveByName = async (siteId, driveName) => {
  const drives = await listDrives(siteId);
  const drive = drives.find(
    (d) => d.name.toLowerCase() === driveName.toLowerCase()
  );
  if (!drive) {
    const names = drives.map((d) => d.name).join(", ");
    throw new Error(
      `Document library "${driveName}" not found. Available: ${names}`
    );
  }
  return drive;
};

/** Get a folder/file item by its path within a drive (e.g. "Z - Operations"). */
export const getItemByPath = async (driveId, itemPath) => {
  const clean = itemPath.replace(/^\/+|\/+$/g, "");
  const encoded = clean
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return graphGet(`/drives/${driveId}/root:/${encoded}`);
};

/** List children of a folder item, following pagination. */
export const listChildren = async (driveId, itemId) => {
  let url = `/drives/${driveId}/items/${itemId}/children?$top=200`;
  const items = [];
  while (url) {
    const data = await graphGet(url);
    items.push(...data.value);
    url = data["@odata.nextLink"] || null;
  }
  return items;
};

/**
 * Recursively walk a folder and yield every FILE item (folders are traversed,
 * not yielded). Each yielded item carries `relativePath` = folder path from the
 * starting folder, useful as `sourceFolder` context in Mongo.
 *
 * This handles the mixed SharePoint structure automatically: year folders,
 * named folders, loose files — all get visited regardless of depth.
 */
export async function* walkFiles(driveId, folderItemId, relativePath = "") {
  const children = await listChildren(driveId, folderItemId);
  for (const child of children) {
    if (child.folder) {
      const childPath = relativePath
        ? `${relativePath}/${child.name}`
        : child.name;
      yield* walkFiles(driveId, child.id, childPath);
    } else if (child.file) {
      yield { ...child, relativePath };
    }
    // (ignore non-file/non-folder items like .lnk shortcuts)
  }
}

/**
 * Download a file's content as a Node Readable stream (for streaming straight
 * into the Spaces upload — never buffered fully to disk/memory).
 */
export const downloadFileStream = async (driveId, itemId) => {
  const token = await getGraphToken();
  const res = await fetch(
    `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    const e = new Error(`Download item ${itemId} failed (${res.status}): ${text}`);
    if (res.status === 429 || res.status >= 500) {
      e.retryable = true;
      const ra = Number(res.headers.get("retry-after"));
      if (ra) e.retryAfterMs = ra * 1000;
    }
    throw e;
  }
  return Readable.fromWeb(res.body);
};