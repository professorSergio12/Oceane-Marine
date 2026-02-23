import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import QhseArchive from "@/lib/mongodb/models/qhse-archive/QhseArchive";

export async function POST(req) {
  await connectDB();

  try {
    const body = await req.json();
    const {
      year,
      module: moduleName,
      documentType,
      formCode,
      title,
      filePath,
      fileUrl,
      originalId,
      metadata,
    } = body;

    const yearNum =
      year != null ? Number(year) : new Date().getFullYear();
    if (Number.isNaN(yearNum)) {
      return NextResponse.json(
        { success: false, error: "Valid year is required" },
        { status: 400 }
      );
    }
    if (!moduleName || typeof moduleName !== "string" || !moduleName.trim()) {
      return NextResponse.json(
        { success: false, error: "Module is required" },
        { status: 400 }
      );
    }

    const doc = await QhseArchive.create({
      year: yearNum,
      module: String(moduleName).trim(),
      documentType: documentType != null ? String(documentType).trim() : "",
      formCode: formCode != null ? String(formCode).trim() : "",
      title: title != null ? String(title).trim() : "",
      filePath: filePath != null ? String(filePath).trim() : "",
      fileUrl: fileUrl != null ? String(fileUrl).trim() : "",
      originalId: originalId != null ? String(originalId).trim() : "",
      metadata: metadata || undefined,
    });

    return NextResponse.json(
      { success: true, message: "Archived", data: doc },
      { status: 201 }
    );
  } catch (error) {
    console.error("Archive create error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
