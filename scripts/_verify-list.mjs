import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const { connectDB } = await import("../src/lib/config/connection.js");
await connectDB();
const SharepointFile = (await import("../src/lib/mongodb/models/SharepointFile.js")).default;
const mongoose = (await import("mongoose")).default;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

for (const base of ["HR", "HR/Oil-Majors", "HR/Statutory-Certificates"]) {
  const docs = await SharepointFile.find({
    module: "HR",
    storageKey: { $regex: `^${escapeRegex(base)}/` },
  }).select("storageKey").lean();

  const folders = new Map();
  let files = 0;
  for (const d of docs) {
    const rel = d.storageKey.slice(base.length + 1);
    const s = rel.indexOf("/");
    if (s === -1) files++;
    else folders.set(rel.slice(0, s), (folders.get(rel.slice(0, s)) || 0) + 1);
  }
  console.log(`\n=== ${base} ===  (${docs.length} files under it)`);
  [...folders.entries()].sort().forEach(([n, c]) => console.log("  📁", n, `(${c})`));
  console.log("  📄 direct files here:", files);
}

console.log("\nTOTAL HR docs in mongo:", await SharepointFile.countDocuments({ module: "HR" }));
await mongoose.disconnect();