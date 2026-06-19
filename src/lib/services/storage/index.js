/**
 * Storage driver switch. Set STORAGE_DRIVER in .env.local:
 *   "local"  (default) -> files on the server disk under uploads/sharepoint
 *   "spaces"           -> DigitalOcean Spaces (when the client provides a bucket)
 *
 * Everything else (migration, model, button) is driver-agnostic and only talks
 * to saveFile() / fileExists() / buildMirrorKey() from here.
 */
import {
  uploadToSpaces,
  objectExists,
  buildMirrorKey,
  disambiguateKey,
} from "./spacesStorage.js";
import { saveToLocal, localExists } from "./localStorage.js";

export const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();

export { buildMirrorKey, disambiguateKey };

/** Save a file (stream/Buffer) and return { key, url }. */
export const saveFile = async ({ key, body, contentType }) => {
  if (STORAGE_DRIVER === "spaces") {
    return uploadToSpaces({ key, body, contentType });
  }
  return saveToLocal({ key, body });
};

/** Check if a file already exists in the active store. */
export const fileExists = async (key) => {
  if (STORAGE_DRIVER === "spaces") {
    return objectExists(key);
  }
  return localExists(key);
};