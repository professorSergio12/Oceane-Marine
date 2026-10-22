import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * Stream a file back to the browser with `Content-Disposition: attachment` so
 * the browser always downloads it in-place — never opens it in a new tab.
 *
 * Query params (one of):
 *   - path : app-relative public path (must start with /uploads/)
 *   - url  : absolute http(s) URL to proxy
 *   - name : optional suggested filename
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get("path") || "";
  const rawUrl = searchParams.get("url") || "";
  const suggestedName = (searchParams.get("name") || "").trim();

  if (!rawPath && !rawUrl) {
    return NextResponse.json(
      { error: "Missing required `path` or `url` parameter" },
      { status: 400 }
    );
  }

  try {
    if (rawPath) {
      if (!rawPath.startsWith("/uploads/") && !rawPath.startsWith("/upload/")) {
        return NextResponse.json(
          { error: "Only /uploads/** and /upload/** paths are allowed" },
          { status: 400 }
        );
      }
      const publicRoot = path.join(process.cwd(), "public");
      const projectRoot = process.cwd();
      const relativeFromUploads = rawPath.replace(/^\/+/, "");

      const candidates = [
        path.normalize(path.join(publicRoot, rawPath)),
        path.normalize(path.join(projectRoot, relativeFromUploads)),
      ];

      let absolute = null;
      for (const candidate of candidates) {
        const allowed =
          candidate.startsWith(publicRoot + path.sep) ||
          candidate.startsWith(path.join(projectRoot, "uploads") + path.sep) ||
          candidate.startsWith(path.join(projectRoot, "upload") + path.sep);
        if (!allowed) continue;
        try {
          await fs.access(candidate);
          absolute = candidate;
          break;
        } catch {
          /* try next */
        }
      }

      if (!absolute) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const data = await fs.readFile(absolute);
      const filename = sanitizeFilename(
        suggestedName || path.basename(rawPath.split("?")[0]) || "download"
      );
      return fileResponse(data, filename);
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http(s) urls are allowed" },
        { status: 400 }
      );
    }

    // Absolute link to this app's own /uploads → serve from disk instead of fetching
    const requestHost = new URL(req.url).host;
    if (parsed.host === requestHost && /^\/uploads?\//.test(parsed.pathname)) {
      const local = new URL(req.url);
      local.search = "";
      local.searchParams.set("path", decodeURIComponent(parsed.pathname));
      if (suggestedName) local.searchParams.set("name", suggestedName);
      return NextResponse.redirect(local);
    }

    // Only proxy known file hosts — never arbitrary / internal addresses (SSRF)
    if (!isAllowedDownloadHost(parsed.hostname)) {
      return NextResponse.json(
        { error: "Downloads from this address are not allowed" },
        { status: 400 }
      );
    }

    const upstream = await fetch(parsed.toString(), { redirect: "error" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status }
      );
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const filename = sanitizeFilename(
      suggestedName || decodeURIComponent(parsed.pathname.split("/").pop() || "download")
    );
    return fileResponse(buffer, filename, upstream.headers.get("content-type"));
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: err?.message || "Failed to download file" },
      { status: 500 }
    );
  }
}

/**
 * Hosts the `url` proxy may fetch from. Extra hosts can be added with
 * FILE_DOWNLOAD_ALLOWED_HOSTS="files.example.com,cdn.example.com" (".example.com" = any subdomain).
 */
const DEFAULT_ALLOWED_HOSTS = [".digitaloceanspaces.com", "res.cloudinary.com"];

function isAllowedDownloadHost(hostname) {
  const host = hostname.toLowerCase();
  const extra = (process.env.FILE_DOWNLOAD_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...extra].some((allowed) =>
    allowed.startsWith(".") ? host.endsWith(allowed) : host === allowed
  );
}

function fileResponse(buffer, filename, contentType) {
  const safeAscii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

function sanitizeFilename(name) {
  return (name || "download").replace(/[\r\n"]/g, "_").slice(0, 200);
}
