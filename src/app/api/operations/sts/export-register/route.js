import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import { buildStsRegisterWorkbook } from "@/lib/operations/stsRegisterExport";

export const runtime = "nodejs";

/**
 * GET /api/operations/sts/export-register
 * Downloads the full operations register: historical Excel data + all app operations.
 */
export async function GET() {
  try {
    await connectDB();
    const { buffer, stats } = await buildStsRegisterWorkbook();

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Oceane-STS-Operations-Register-${date}.xlsx"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
        "X-Register-Stats": JSON.stringify(stats),
      },
    });
  } catch (error) {
    console.error("STS register export error:", error);
    const message =
      error?.code === "ENOENT"
        ? "The historical Excel file was not found on the server (public/templates/back-data)."
        : error.message || "Failed to build the register";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
