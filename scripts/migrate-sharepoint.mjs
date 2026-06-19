/**
 * CLI for the SharePoint -> DigitalOcean Spaces sync (same logic the button uses).
 *
 * Usage (from project root):
 *   node scripts/migrate-sharepoint.mjs hr --dry-run   # list what WOULD happen
 *   node scripts/migrate-sharepoint.mjs hr             # real sync (needs Spaces + Mongo)
 *   node scripts/migrate-sharepoint.mjs operations --dry-run
 *
 * Modules: hr | operations | pms | qhse  (see src/lib/services/sharepoint/moduleConfig.js)
 * --dry-run only talks to SharePoint, so it works before Spaces/Mongo are ready.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const moduleKey = argv.find((a) => !a.startsWith("--"))?.toLowerCase();

const siteUrl = process.env.SHAREPOINT_SITE_URL;
if (!siteUrl) {
  console.error("Set SHAREPOINT_SITE_URL in .env.local");
  process.exit(1);
}
if (!moduleKey) {
  console.error("Usage: node scripts/migrate-sharepoint.mjs <hr|operations|pms|qhse> [--dry-run]");
  process.exit(1);
}

const { runModuleSync } = await import(
  "../src/lib/services/sharepoint/migrateModule.js"
);

let mongoose;
if (!dryRun) {
  const { connectDB } = await import("../src/lib/config/connection.js");
  await connectDB();
  mongoose = (await import("mongoose")).default;
}

try {
  const stats = await runModuleSync({ moduleKey, siteUrl, dryRun });
  console.log(
    `\n=== TOTAL: ${stats.uploaded} uploaded, ${stats.skipped} skipped, ` +
      `${stats.failed} failed (of ${stats.total}) ${dryRun ? "[DRY RUN]" : ""}`
  );
} catch (e) {
  console.error("\nSync error:", e.message || e);
  process.exitCode = 1;
} finally {
  if (mongoose) await mongoose.disconnect();
}