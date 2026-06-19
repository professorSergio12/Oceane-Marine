/**
 * Recover only the FAILED/missing files of a module (efficient — no full re-walk
 * of Mongo per file). Bulk-loads existing SharePoint IDs once, walks the source,
 * and re-processes only the files not yet in Mongo (applies retry + collision fix).
 *
 *   node scripts/recover-module.mjs operations
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const moduleKey = (process.argv[2] || "").toLowerCase();
if (!moduleKey) {
  console.error("Usage: node scripts/recover-module.mjs <hr|pms|qhse|operations>");
  process.exit(1);
}

const { connectDB } = await import("../src/lib/config/connection.js");
await connectDB();
const mongoose = (await import("mongoose")).default;
const SharepointFile = (await import("../src/lib/mongodb/models/SharepointFile.js")).default;

const {
  resolveSiteId, findDriveByName, getItemByPath, walkFiles, downloadFileStream, withRetry,
} = await import("../src/lib/services/sharepoint/sharepointClient.js");
const {
  buildMirrorKey, saveFile, disambiguateKey, STORAGE_DRIVER,
} = await import("../src/lib/services/storage/index.js");
const {
  getModuleConfig, SHAREPOINT_LIBRARY, shouldSkipFile,
} = await import("../src/lib/services/sharepoint/moduleConfig.js");

const config = getModuleConfig(moduleKey);
if (!config) { console.error(`Unknown module ${moduleKey}`); process.exit(1); }

// 1) Bulk-load every sharePointId already in Mongo for this module → Set.
console.log(`Loading existing ${config.label} IDs from Mongo...`);
const existing = new Set(
  (await SharepointFile.find({ module: config.label }).select("sharePointId").lean())
    .map((d) => d.sharePointId)
);
console.log(`  ${existing.size} already synced.`);

const siteId = await resolveSiteId(process.env.SHAREPOINT_SITE_URL);
const drive = await findDriveByName(siteId, SHAREPOINT_LIBRARY);

const stats = { recovered: 0, failed: 0, scanned: 0 };

for (const folder of config.folders) {
  const rootItem = await getItemByPath(drive.id, folder.sharePointPath);
  for await (const file of walkFiles(drive.id, rootItem.id)) {
    stats.scanned += 1;
    if (shouldSkipFile(file.name)) continue;
    if (existing.has(file.id)) continue; // already in Mongo — skip fast (in-memory)

    // This file is missing — re-process it.
    const modified = file.lastModifiedDateTime
      ? new Date(file.lastModifiedDateTime)
      : new Date(file.createdDateTime || Date.now());
    const meta = deriveDateMeta(file.relativePath, modified);
    const key = buildMirrorKey(folder.keyPrefix, file.relativePath, file.name);

    const doc = (storageKey, storageUrl) => ({
      module: config.label, subModule: folder.subModule,
      year: meta.year, month: meta.month, day: meta.day,
      storageKey, storageUrl, storageDriver: STORAGE_DRIVER,
      originalName: file.name, fileSize: file.size ?? 0, mimeType: file.file?.mimeType ?? "",
      sharePointId: file.id, sourceFolder: file.relativePath || "",
      sharePointModified: modified, sharePointWebUrl: file.webUrl ?? "",
    });
    const dl = (k) => withRetry(async () => {
      const body = await downloadFileStream(drive.id, file.id);
      return saveFile({ key: k, body, contentType: file.file?.mimeType });
    }, `download ${file.name}`);

    try {
      const saved = await dl(key);
      try {
        await SharepointFile.create(doc(key, saved.url));
      } catch (err) {
        if (err?.code === 11000) {
          const altKey = disambiguateKey(key, file.id.slice(-6));
          const altSaved = await dl(altKey);
          await SharepointFile.create(doc(altKey, altSaved.url));
          console.log(`  ↳ collision resolved: ${altKey}`);
        } else throw err;
      }
      stats.recovered += 1;
      console.log(`  ✅ ${file.relativePath}/${file.name}`);
    } catch (err) {
      stats.failed += 1;
      console.error(`  ❌ ${file.relativePath}/${file.name} — ${err.message}`);
    }
  }
}

console.log(`\n=== Recovery done: ${stats.recovered} recovered, ${stats.failed} still failed (scanned ${stats.scanned})`);
await mongoose.disconnect();

function deriveDateMeta(relativePath, modifiedDate) {
  const segments = (relativePath || "").split("/").filter(Boolean);
  let year = null, month = null;
  for (const seg of segments) {
    const y = seg.match(/^(20\d{2})$/);
    if (y) { year = Number(y[1]); continue; }
    if (year && !month) {
      const mm = seg.match(/^(0?[1-9]|1[0-2])\b/);
      if (mm) month = String(Number(mm[1])).padStart(2, "0");
    }
  }
  if (!year) {
    year = modifiedDate.getUTCFullYear();
    month = String(modifiedDate.getUTCMonth() + 1).padStart(2, "0");
  }
  return { year, month: month || String(modifiedDate.getUTCMonth() + 1).padStart(2, "0"), day: String(modifiedDate.getUTCDate()).padStart(2, "0") };
}
