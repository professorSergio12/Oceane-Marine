import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import SharepointFile from "@/lib/mongodb/models/SharepointFile";

/**
 * GET /api/sharepoint/files?module=HR&path=HR/Oil-Majors
 *
 * Returns the immediate folder contents at `path` (one level), reconstructed
 * from the mirrored storageKey paths — so the UI can browse exactly like the
 * SharePoint folder tree.
 *
 * Response: { breadcrumb:[{name,path}], folders:[{name,path,count}], files:[...] }
 */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const sp = new URL(req.url).searchParams;
  const moduleLabel = sp.get("module") || "HR";
  // Default to the module root; never let path escape the module.
  let basePath = (sp.get("path") || moduleLabel).replace(/\/+$/, "");
  if (basePath !== moduleLabel && !basePath.startsWith(`${moduleLabel}/`)) {
    basePath = moduleLabel;
  }

  try {
    const docs = await SharepointFile.find({
      module: moduleLabel,
      storageKey: { $regex: `^${escapeRegex(basePath)}/` },
    })
      .select("storageKey storageUrl originalName fileSize mimeType sharePointModified subModule")
      .lean();

    const folderMap = new Map(); // name -> count
    const files = [];

    for (const d of docs) {
      const rel = d.storageKey.slice(basePath.length + 1); // strip "basePath/"
      const slash = rel.indexOf("/");
      if (slash === -1) {
        // Direct file at this level
        files.push({
          name: d.originalName || rel,
          url: d.storageUrl,
          size: d.fileSize || 0,
          mimeType: d.mimeType || "",
          modified: d.sharePointModified || null,
        });
      } else {
        // Belongs to a subfolder
        const folderName = rel.slice(0, slash);
        folderMap.set(folderName, (folderMap.get(folderName) || 0) + 1);
      }
    }

    const folders = [...folderMap.entries()]
      .map(([name, count]) => ({ name, path: `${basePath}/${name}`, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    files.sort((a, b) => a.name.localeCompare(b.name));

    // Breadcrumb from module root down to basePath
    const parts = basePath.split("/");
    const breadcrumb = parts.map((name, i) => ({
      name,
      path: parts.slice(0, i + 1).join("/"),
    }));

    return NextResponse.json(
      { breadcrumb, folders, files, total: docs.length },
      { status: 200 }
    );
  } catch (err) {
    console.error("SharePoint files list error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list files" },
      { status: 500 }
    );
  }
}