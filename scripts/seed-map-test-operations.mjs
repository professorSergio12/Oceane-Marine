/**
 * Seeds IN-PROGRESS test operations at one location to check the Operations Map popup.
 * Every record uses the ref prefix "TEST-MAP-" so it can be removed cleanly.
 * No equipment is attached, so nothing in PMS gets locked.
 *
 * Usage:
 *   node scripts/seed-map-test-operations.mjs                 # seed 10 at "Fujairah S Anchorage"
 *   node scripts/seed-map-test-operations.mjs "Location Name" # seed 10 at another location
 *   node scripts/seed-map-test-operations.mjs --remove        # delete only the TEST-MAP- records
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const REF_PREFIX = "TEST-MAP-";
const SEED_COUNT = 10;
const VESSELS = [
  ["MT Test Aurora", "MT Test Borealis"],
  ["MT Test Cygnus", "MT Test Draco"],
  ["MT Test Eridanus", "MT Test Fornax"],
  ["MT Test Gemini", "MT Test Hydra"],
  ["MT Test Indus", "MT Test Lyra"],
];

async function main() {
  const args = process.argv.slice(2);
  const remove = args.includes("--remove");
  const locationName = args.find((a) => !a.startsWith("--")) || "Fujairah S Anchorage";

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to database "${db.databaseName}"`);

  const operations = db.collection("stsoperations");
  const refFilter = { Operation_Ref_No: { $regex: `^${REF_PREFIX}` } };

  if (remove) {
    const result = await operations.deleteMany(refFilter);
    console.log(`Removed ${result.deletedCount} ${REF_PREFIX} test operations`);
    return;
  }

  // Case-insensitive and tolerant of extra spaces ("Fujairah S  Anchorage")
  const namePattern = locationName
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const location = await db.collection("locations").findOne({ name: { $regex: `^\\s*${namePattern}\\s*$`, $options: "i" } });
  if (!location) throw new Error(`Location "${locationName}" not found`);

  const existing = await operations.countDocuments(refFilter);
  if (existing > 0) {
    console.log(`${existing} ${REF_PREFIX} records already exist — run with --remove first to reseed`);
    return;
  }

  const now = new Date();
  const docs = Array.from({ length: SEED_COUNT }, (_, i) => {
    const _id = new mongoose.Types.ObjectId();
    const [chs, ms] = VESSELS[i % VESSELS.length];
    const start = new Date(now.getTime() - i * 6 * 60 * 60 * 1000); // every 6 hours back
    return {
      _id,
      parentOperationId: _id,
      version: 1,
      isLatest: true,
      Operation_Ref_No: `${REF_PREFIX}${String(i + 1).padStart(2, "0")}`,
      location: location._id,
      client: "Test Client (map seed)",
      operationStatus: "INPROGRESS",
      isSubmitted: true,
      submittedAt: now,
      operationStartTime: start,
      flowDirection: "left",
      chs,
      ms,
      equipments: [],
      createdAt: now,
      updatedAt: now,
    };
  });

  await operations.insertMany(docs);
  console.log(`Inserted ${docs.length} IN-PROGRESS test operations at "${location.name}" (${REF_PREFIX}01–${REF_PREFIX}${SEED_COUNT})`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
