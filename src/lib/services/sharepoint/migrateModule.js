import {
  resolveSiteId,
  findDriveByName,
  getItemByPath,
  walkFiles,
  downloadFileStream,
  withRetry,
} from "./sharepointClient.js";
import {
  buildMirrorKey,
  saveFile,
  disambiguateKey,
  STORAGE_DRIVER,
} from "../storage/index.js";
import {
  getModuleConfig,
  SHAREPOINT_LIBRARY,
  shouldSkipFile,
} from "./moduleConfig.js";
import SharepointFile from "../../mongodb/models/SharepointFile.js";

/**
 * Sync one app module (e.g. "hr") from SharePoint -> DigitalOcean Spaces,
 * storing a pointer record in MongoDB for each file. Mirrors the SharePoint
 * folder layout exactly.
 *
 * @param {object} opts
 * @param {string} opts.moduleKey            "hr" | "operations" | "pms" | "qhse"
 * @param {string} opts.siteUrl              process.env.SHAREPOINT_SITE_URL
 * @param {boolean} [opts.dryRun]            list only, no upload / no Mongo writes
 * @param {(p:object)=>Promise<void>|void} [opts.onProgress]
 *        called periodically with { uploaded, skipped, failed, total, currentFolder }
 * @returns {Promise<{uploaded,skipped,failed,total}>}
 */
export const runModuleSync = async ({
  moduleKey,
  siteUrl,
  dryRun = false,
  onProgress,
}) => {
  const config = getModuleConfig(moduleKey);
  if (!config) throw new Error(`Unknown module "${moduleKey}"`);

  const stats = { uploaded: 0, skipped: 0, failed: 0, total: 0 };

  console.log(`\n▶  Sync module "${config.label}"  (${config.folders.length} folder(s))`);
  const siteId = await resolveSiteId(siteUrl);
  const drive = await findDriveByName(siteId, SHAREPOINT_LIBRARY);

  // Report progress at most every N processed files (avoid hammering Mongo).
  let sinceReport = 0;
  const report = async (currentFolder, force = false) => {
    sinceReport += 1;
    if (onProgress && (force || sinceReport >= 25)) {
      sinceReport = 0;
      await onProgress({ ...stats, currentFolder });
    }
  };

  for (const folder of config.folders) {
    console.log(`   📂 ${folder.sharePointPath}  ->  ${folder.keyPrefix}`);
    const rootFolder = await getItemByPath(drive.id, folder.sharePointPath);

    for await (const file of walkFiles(drive.id, rootFolder.id)) {
      stats.total += 1;

      try {
        // Skip junk (shortcuts, db backups, etc.)
        if (shouldSkipFile(file.name)) {
          stats.skipped += 1;
          await report(folder.sharePointPath);
          continue;
        }

        const key = buildMirrorKey(folder.keyPrefix, file.relativePath, file.name);

        if (dryRun) {
          stats.uploaded += 1;
          console.log(`     📝 ${key}`);
          await report(folder.sharePointPath);
          continue;
        }

        // Skip if already migrated (idempotent re-run).
        const exists = await SharepointFile.findOne({ sharePointId: file.id })
          .select("_id")
          .lean();
        if (exists) {
          stats.skipped += 1;
          await report(folder.sharePointPath);
          continue;
        }

        const modified = file.lastModifiedDateTime
          ? new Date(file.lastModifiedDateTime)
          : new Date(file.createdDateTime || Date.now());
        const meta = deriveDateMeta(file.relativePath, modified);

        // Stream SharePoint -> active storage (local disk or Spaces).
        // Wrapped in retry: large syncs hit transient "fetch failed" /
        // "terminated" (mid-stream socket drop) / Graph 429 throttling. Each
        // attempt re-opens the download, so a half-written file is replaced.
        const downloadAndSave = (targetKey) =>
          withRetry(async () => {
            const body = await downloadFileStream(drive.id, file.id);
            return saveFile({ key: targetKey, body, contentType: file.file?.mimeType });
          }, `download ${file.name}`);

        const buildDoc = (storageKey, storageUrl) => ({
          module: config.label,
          subModule: folder.subModule,
          year: meta.year,
          month: meta.month,
          day: meta.day,
          storageKey,
          storageUrl,
          storageDriver: STORAGE_DRIVER,
          originalName: file.name,
          fileSize: file.size ?? 0,
          mimeType: file.file?.mimeType ?? "",
          sharePointId: file.id,
          sourceFolder: file.relativePath || "",
          sharePointModified: modified,
          sharePointWebUrl: file.webUrl ?? "",
        });

        const saved = await downloadAndSave(key);
        try {
          await SharepointFile.create(buildDoc(key, saved.url));
        } catch (err) {
          // Two different SharePoint files sanitized to the same key (names
          // differing only by spaces/dashes). Disambiguate with a short id
          // suffix so both are kept instead of one clobbering the other.
          const dupKey =
            err?.code === 11000 && /storageKey/.test(JSON.stringify(err?.keyPattern || err?.message || ""));
          if (!dupKey) throw err;
          const altKey = disambiguateKey(key, file.id.slice(-6));
          const altSaved = await downloadAndSave(altKey);
          await SharepointFile.create(buildDoc(altKey, altSaved.url));
          console.log(`     ↳ key collision resolved: ${altKey}`);
        }

        stats.uploaded += 1;
        await report(folder.sharePointPath);
      } catch (err) {
        stats.failed += 1;
        console.error(`     ❌ ${file.relativePath}/${file.name} — ${err.message}`);
        await report(folder.sharePointPath);
      }
    }
  }

  if (onProgress) await onProgress({ ...stats, currentFolder: null });
  console.log(
    `   Done: ${stats.uploaded} uploaded, ${stats.skipped} skipped, ${stats.failed} failed (of ${stats.total})`
  );
  return stats;
};

/**
 * Derive year/month/day for Mongo filtering.
 * Prefer the SharePoint folder path (e.g. "2022/01-Jan/...") so files stay in
 * their real year; fall back to the file's modified date when there's no year
 * folder (e.g. "Shell/...").
 */
const deriveDateMeta = (relativePath, modifiedDate) => {
  const segments = (relativePath || "").split("/").filter(Boolean);

  let year = null;
  let month = null;
  for (const seg of segments) {
    const y = seg.match(/^(20\d{2})$/);
    if (y) {
      year = Number(y[1]);
      continue;
    }
    if (year && !month) {
      const m = seg.match(/^(0?[1-9]|1[0-2])\b/); // "01", "02-Feb", "1-Jan"
      if (m) month = String(Number(m[1])).padStart(2, "0");
    }
  }

  if (!year) {
    year = modifiedDate.getUTCFullYear();
    month = String(modifiedDate.getUTCMonth() + 1).padStart(2, "0");
  }
  return {
    year,
    month: month || String(modifiedDate.getUTCMonth() + 1).padStart(2, "0"),
    day: String(modifiedDate.getUTCDate()).padStart(2, "0"),
  };
};