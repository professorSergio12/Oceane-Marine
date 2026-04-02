import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/config/connection";
import StsBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";
import { notifyEdit, notifyDelete } from "@/lib/notifications/moduleNotify";

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const report = await StsBaseAuditReport.findById(id);
    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }
    const filePath = report.filePath;
    await StsBaseAuditReport.findByIdAndDelete(id);
    if (filePath) {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // ignore file delete errors
        }
      }
    }
    void notifyDelete("QHSE", "form-checklist · base-audit", id);
    return NextResponse.json(
      { success: true, message: "Report deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete base audit report error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
