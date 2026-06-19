/**
 * Explore the SharePoint library structure (top-level folders + one level deep).
 * Read-only, no upload, no Mongo. Helps map SharePoint folders -> app modules.
 *
 *   node scripts/explore-sharepoint.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const LIBRARY_NAME = "Oceane Group Filing";
const siteUrl = process.env.SHAREPOINT_SITE_URL;

const { resolveSiteId, listDrives, findDriveByName, listChildren } =
  await import("../src/lib/services/sharepoint/sharepointClient.js");

const siteId = await resolveSiteId(siteUrl);

console.log("\n=== All document libraries on this site ===");
const drives = await listDrives(siteId);
for (const d of drives) console.log(`  • ${d.name}`);

const drive = await findDriveByName(siteId, LIBRARY_NAME);
const { getItemByPath } = await import(
  "../src/lib/services/sharepoint/sharepointClient.js"
);

// Root of the chosen library
const rootChildren = await listChildren(drive.id, "root");

console.log(`\n=== Top-level folders in "${LIBRARY_NAME}" ===`);
for (const item of rootChildren) {
  const kind = item.folder ? `📁 (${item.folder.childCount} items)` : "📄";
  console.log(`  ${kind}  ${item.name}`);
}

// One level deep for each top-level FOLDER
for (const item of rootChildren) {
  if (!item.folder) continue;
  console.log(`\n--- Inside "${item.name}" ---`);
  const children = await listChildren(drive.id, item.id);
  for (const c of children) {
    const kind = c.folder ? `📁 (${c.folder.childCount})` : "📄";
    console.log(`    ${kind}  ${c.name}`);
  }
}

console.log("\nDone.");