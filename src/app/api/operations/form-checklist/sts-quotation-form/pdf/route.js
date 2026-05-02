import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import puppeteer from "puppeteer";

export const maxDuration = 60;

function escapeForHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/** Inline absolute-rooted asset URLs (`src="/foo/bar.png"`) as data: URLs.
 * Required because `page.setContent()` resolves relative URLs against `about:blank`,
 * so /public/* would otherwise 404 inside the headless page. */
async function inlinePublicAssets(html) {
  const publicDir = path.join(process.cwd(), "public");
  const cache = new Map();
  const re = /(src|href)\s*=\s*"\/([^"#?]+\.(?:png|jpe?g|gif|svg|webp))"/gi;
  const matches = [...html.matchAll(re)];
  for (const m of matches) {
    const rel = m[2];
    if (cache.has(rel)) continue;
    cache.set(rel, null);
    try {
      const filePath = path.join(publicDir, rel);
      if (!filePath.startsWith(publicDir)) continue;
      const buf = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_BY_EXT[ext] || "application/octet-stream";
      cache.set(rel, `data:${mime};base64,${buf.toString("base64")}`);
    } catch {
      // ignored: leave the original src so the page still renders broken-image alt
    }
  }
  return html.replace(re, (full, attr, rel) => {
    const data = cache.get(rel);
    return data ? `${attr}="${data}"` : full;
  });
}

export async function POST(req) {
  let browser;
  try {
    const { html, formNoLine } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing or invalid html" }, { status: 400 });
    }

    const footerText = formNoLine != null ? escapeForHtml(String(formNoLine)) : "";
    const htmlForPdf = await inlinePublicAssets(html);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    await page.setContent(htmlForPdf, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "22mm", right: "10mm", bottom: "18mm", left: "10mm" },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;height:12mm;display:flex;align-items:center;padding:0;box-sizing:border-box;">
          <div style="display:inline-flex;align-items:center;justify-content:center;min-width:14mm;height:12mm;background:#1e3a5f;color:#fff;font-size:12pt;font-weight:bold;font-family:Arial,sans-serif;border-radius:0 8px 8px 0;padding:0 10px 0 12px;">
            <span class="pageNumber"></span>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;height:12mm;display:flex;align-items:center;justify-content:flex-end;padding:0 12mm;box-sizing:border-box;background:#1e3a5f;color:#fff;font-size:9pt;font-family:Arial,sans-serif;">
          <span>${footerText}</span>
        </div>
      `,
    });

    await browser.close();
    browser = null;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="quotation.pdf"',
      },
    });
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error("STS quotation PDF generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
