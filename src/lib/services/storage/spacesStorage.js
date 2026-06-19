import { Upload } from "@aws-sdk/lib-storage";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSpacesClient, getSpacesBucket } from "../../config/spaces.js";

/**
 * Build a clean object key: module/year/month/date/filename
 * e.g. buildObjectKey("Operations", new Date(), "STS report.pdf")
 *      -> "Operations/2024/06/14/STS-report.pdf"
 *
 * The date drives the year/month/date path, NOT the SharePoint folder name —
 * this keeps the structure consistent even though SharePoint is mixed
 * (some folders are year-wise, some are name-wise).
 */
export const buildObjectKey = (module, date, fileName) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  const safeModule = sanitizeSegment(module);
  const safeName = sanitizeFileName(fileName);

  return `${safeModule}/${year}/${month}/${day}/${safeName}`;
};

/**
 * Build a key that MIRRORS the SharePoint folder structure under a prefix.
 * e.g. buildMirrorKey("HR/Oil-Majors", "Shell/2024", "audit.pdf")
 *      -> "HR/Oil-Majors/Shell/2024/audit.pdf"
 *
 * This preserves the exact SharePoint organization (year folders, name folders)
 * instead of reconstructing a date path — so nothing about the layout is lost.
 */
export const buildMirrorKey = (keyPrefix, relativePath, fileName) => {
  const segments = [];
  // keyPrefix may itself contain slashes (e.g. "HR/Oil-Majors") — keep as-is.
  if (keyPrefix) segments.push(keyPrefix);
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
 * different SharePoint files sanitize to the SAME key (e.g. names that differ
 * only by spaces/dashes) — keeps both instead of one overwriting the other.
 *   disambiguateKey("a/b/file.docx", "X9K2")  ->  "a/b/file-X9K2.docx"
 */
export const disambiguateKey = (key, suffix) => {
  const slash = key.lastIndexOf("/");
  const dot = key.lastIndexOf(".");
  if (dot > slash + 1) return `${key.slice(0, dot)}-${suffix}${key.slice(dot)}`;
  return `${key}-${suffix}`;
};

/**
 * Upload a file (stream or Buffer) to DigitalOcean Spaces.
 * Uses lib-storage's Upload, which streams in parts — safe for large files.
 *
 * @param {object} opts
 * @param {string} opts.key            full object key (use buildObjectKey)
 * @param {Readable|Buffer} opts.body  the file content
 * @param {string} [opts.contentType]
 * @param {"private"|"public-read"} [opts.acl="private"]
 * @returns {Promise<{ key: string, bucket: string, url: string }>}
 */
export const uploadToSpaces = async ({
  key,
  body,
  contentType,
  acl = "private",
}) => {
  const bucket = getSpacesBucket();

  const upload = new Upload({
    client: getSpacesClient(),
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
      ACL: acl,
    },
  });

  await upload.done();
  return { key, bucket, url: buildPublicUrl(key) };
};

/**
 * Check whether an object already exists in Spaces (used to skip re-uploads
 * on a re-run so the migration is idempotent).
 */
export const objectExists = async (key) => {
  const bucket = getSpacesBucket();
  try {
    await getSpacesClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") {
      return false;
    }
    throw err;
  }
};

/** Construct the object URL (https://<bucket>.<region>.digitaloceanspaces.com/<key>). */
export const buildPublicUrl = (key) => {
  const bucket = process.env.SPACES_BUCKET;
  const endpoint = (process.env.SPACES_ENDPOINT || "").replace(/^https?:\/\//, "");
  if (!bucket || !endpoint) return key;
  return `https://${bucket}.${endpoint}/${key}`;
};

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