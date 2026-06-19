import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "node:stream/promises";
import { Writable } from "node:stream";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const { connectDB } = await import("../src/lib/config/connection.js");
await connectDB();
const SharepointFile = (await import("../src/lib/mongodb/models/SharepointFile.js")).default;
const mongoose = (await import("mongoose")).default;

const {
  resolveSiteId, findDriveByName, getItemByPath, walkFiles, downloadFileStream,
} = await import("../src/lib/services/sharepoint/sharepointClient.js");
const { shouldSkipFile } = await import("../src/lib/services/sharepoint/moduleConfig.js");

const siteId = await resolveSiteId(process.env.SHAREPOINT_SITE_URL);
const drive = await findDriveByName(siteId, "Oceane Group Filing");

const folders = [
  { path: "F - Quality", prefix: "QHSE/Quality" },
  { path: "B - Health & Safety", prefix: "QHSE/Health-Safety" },
];

const missing = [];
for (const f of folders) {
  const rootItem = await getItemByPath(drive.id, f.path);
  for await (const file of walkFiles(drive.id, rootItem.id)) {
    if (shouldSkipFile(file.name)) continue;
    const inMongo = await SharepointFile.findOne({ sharePointId: file.id }).select("_id").lean();
    if (!inMongo) missing.push(file);
  }
}

console.log(`\nFiles NOT in Mongo (failed): ${missing.length}\n`);
for (const file of missing) {
  console.log(`📄 ${file.relativePath}/${file.name}`);
  console.log(`   size: ${file.size} bytes | id: ${file.id}`);
  try {
    const body = await downloadFileStream(drive.id, file.id);
    let bytes = 0;
    await pipeline(body, new Writable({ write(c, e, cb) { bytes += c.length; cb(); } }));
    console.log(`   ✅ download OK (${bytes} bytes) — so failure was likely the LOCAL SAVE step`);
  } catch (e) {
    console.log(`   ❌ download error: ${e.message}`);
  }
  console.log("");
}

await mongoose.disconnect();
