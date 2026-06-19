import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const siteUrl = process.env.SHAREPOINT_SITE_URL;
const { resolveSiteId, findDriveByName, getItemByPath, listChildren } =
  await import("../src/lib/services/sharepoint/sharepointClient.js");

const siteId = await resolveSiteId(siteUrl);
const drive = await findDriveByName(siteId, "Oceane Group Filing");

const targets = ["R - PMS", "Q - Equipments Inventory", "H - Equipment Certificates, Site Insp"];
for (const t of targets) {
  console.log(`\n========== ${t} ==========`);
  const root = await getItemByPath(drive.id, t);
  const children = await listChildren(drive.id, root.id);
  for (const c of children) {
    const kind = c.folder ? `📁 (${c.folder.childCount})` : "📄";
    console.log(`  ${kind} ${c.name}`);
    if (c.folder) {
      const sub = await listChildren(drive.id, c.id);
      sub.slice(0, 8).forEach((s) => console.log(`       ${s.folder ? "📁" : "📄"} ${s.name}`));
      if (sub.length > 8) console.log(`       ...(+${sub.length - 8} more)`);
    }
  }
}
console.log("\nDone.");