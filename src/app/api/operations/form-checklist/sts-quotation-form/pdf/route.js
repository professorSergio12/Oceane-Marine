import { NextResponse } from "next/server";
import path from "path";
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

export async function POST(req) {
  let browser;
  try {
    const { html, formNoLine } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing or invalid html" }, { status: 400 });
    }

    const footerText = formNoLine != null ? escapeForHtml(String(formNoLine)) : "";

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    const baseUrl = "file://" + path.join(process.cwd(), "public").replace(/\\/g, "/");
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
      baseURL: baseUrl,
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
