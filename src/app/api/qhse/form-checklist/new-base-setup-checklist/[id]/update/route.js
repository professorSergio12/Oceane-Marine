import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import NewBaseSetupChecklist from "@/lib/mongodb/models/qhse-form-checklist/NewBaseSetupChecklist";
import { saveQhseFile } from "@/lib/utils/qhse-file-storage";
import { notifyEdit } from "@/lib/notifications/moduleNotify";

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
    const baseName = formData.get("baseName");
    const uploadedByName = formData.get("uploadedByName");
    const uploadedByUserId = formData.get("uploadedByUserId");
    const dateInput = formData.get("date");

    if (!file || !baseName) {
      return NextResponse.json(
        { error: "File and baseName are required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .docx files are allowed" },
        { status: 400 }
      );
    }

    const latest = await NewBaseSetupChecklist.findOne({
      baseName,
    }).sort({ uploadedAt: -1 });

    const nextVersion = getNextVersion(latest?.version);

    let recordDate = new Date();
    if (dateInput && typeof dateInput === "string") {
      const parsed = new Date(dateInput);
      if (!Number.isNaN(parsed.getTime())) recordDate = parsed;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const filePath = await saveQhseFile({
      formCode: "QAF-OFD-051",
      location: baseName,
      date: recordDate,
      title: baseName,
      fileType: "documents",
      fileName: file.name,
      buffer,
    });

    const record = await NewBaseSetupChecklist.create({
      baseName,
      filePath,
      version: nextVersion,
      date: recordDate,
      uploadedBy: {
        userId: uploadedByUserId || null,
        name: uploadedByName || null,
      },
    });

    void notifyEdit("QHSE", "form-checklist · new-base-setup-checklist · update", record._id);
    return NextResponse.json({
      success: true,
      message: "New Base Setup Checklist uploaded successfully",
      data: record,
    });
  } catch (error) {
    console.error("New Base Setup Upload Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
