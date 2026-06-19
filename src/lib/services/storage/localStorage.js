import fs from "node:fs";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

/**
 * Local-disk storage driver (used when there is no DigitalOcean Spaces bucket).
 *
 * Files are written under  <project>/uploads/sharepoint/<key>  and served by the
 * existing /api/files/download route (which already allows /uploads/** paths).
 * MongoDB stores only the key/url — never the file bytes.
 */

const BASE_SUBDIR = ["uploads", "sharepoint"];

const baseDir = () => path.join(process.cwd(), ...BASE_SUBDIR);

/** On Windows, bypass the 260-char MAX_PATH limit for deep mirrored folders. */
const toOsPath = (p) =>
  process.platform === "win32" ? "\\\\?\\" + path.resolve(p) : p;

/** Absolute on-disk path for a storage key (key uses forward slashes). */
const absPathForKey = (key) => path.join(baseDir(), ...key.split("/"));

/** Public/relative path stored in Mongo + used by the download route. */
export const buildLocalUrl = (key) => `/${BASE_SUBDIR.join("/")}/${key}`;

/** Write a stream/Buffer to disk, creating folders. Returns key + url. */
export const saveToLocal = async ({ key, body }) => {
  const abs = absPathForKey(key);
  await mkdir(path.dirname(toOsPath(abs)), { recursive: true });

  const source = Buffer.isBuffer(body) ? Readable.from(body) : body;
  await pipeline(source, fs.createWriteStream(toOsPath(abs)));

  return { key, localPath: abs, url: buildLocalUrl(key) };
};

/** True if the file already exists on disk (idempotent re-run support). */
export const localExists = async (key) => {
  try {
    await access(toOsPath(absPathForKey(key)));
    return true;
  } catch {
    return false;
  }
};