import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";
import { saveQhseFile } from "@/lib/utils/qhse-file-storage";

export const runtime = "nodejs";

function getNextVersion(latestVersion) {
  if (!latestVersion) return "1.0";
  return (parseFloat(latestVersion) + 0.1).toFixed(1);
}

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const documentKey = formData.get("documentKey");
    const uploadedBy = formData.get("uploadedBy");

    if (!file || !documentKey) {
      return NextResponse.json(
        { error: "File and documentKey are required" },
        { status: 400 }
      );
    }

    const latest = await StsBaseAuditReport.findOne({ documentKey }).sort({
      uploadedAt: -1,
    });

    const nextVersion = getNextVersion(latest?.version);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const locationName = latest?.location?.name || null;
    const recordDate = latest?.date || new Date();

    const filePath = await saveQhseFile({
      formCode: "QAF-OFD-004",
      location: locationName,
      date: recordDate,
      title: documentKey || "Base-Audit",
      fileType: "documents",
      fileName: file.name,
      buffer,
    });

    const record = await StsBaseAuditReport.create({
      documentKey,
      filePath,
      version: nextVersion,
      date: new Date(),
      uploadedBy: { name: uploadedBy },
    });

    return NextResponse.json({
      message: "Document updated successfully",
      version: nextVersion,
      data: record,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
