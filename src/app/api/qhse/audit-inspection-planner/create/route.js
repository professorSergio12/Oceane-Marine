import { NextResponse } from "next/server";
import path from "path";
import { connectDB } from "@/lib/config/connection";
import AuditInspectionPlanner from "@/lib/mongodb/models/qhse-audit-inspection/AuditInspectionPlanner";
import { getNextYearwiseSerial } from "@/lib/mongodb/models/YearwiseSerialCounter";
import { saveQhseFile } from "@/lib/utils/qhse-file-storage";

export const runtime = "nodejs";

const ALLOWED_EXT = new Set([
  ".pdf", ".xlsx", ".xls", ".csv", ".doc", ".docx", ".jpg", ".jpeg", ".png",
]);

const MAX_SIZE = 25 * 1024 * 1024;

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();
    const rawData = formData.get("data");

    if (!rawData) {
      return NextResponse.json({ error: "Form data missing" }, { status: 400 });
    }

    const body = JSON.parse(rawData);
    const { issueDate, approvedBy, categories, year } = body;

    if (!issueDate || !approvedBy || !Array.isArray(categories)) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const yearNum = year != null && !Number.isNaN(Number(year)) ? Number(year) : undefined;
    const recordDate = issueDate ? new Date(issueDate) : new Date();

    for (const cat of categories) {
      for (const row of cat.rows) {
        const file = formData.get(`file_${row.rowId}`);

        if (file && typeof file !== "string") {
          if (file.size > MAX_SIZE) {
            return NextResponse.json(
              { error: `File too large for row ${row.rowId}` },
              { status: 400 }
            );
          }

          const ext = path.extname(file.name).toLowerCase();
          if (!ALLOWED_EXT.has(ext)) {
            return NextResponse.json(
              { error: `Invalid file type for row ${row.rowId}` },
              { status: 400 }
            );
          }

          const buffer = Buffer.from(await file.arrayBuffer());

          const filePath = await saveQhseFile({
            formCode: "QAF-OFD-048",
            date: recordDate,
            title: cat.category || "Audit-Inspection",
            fileType: "documents",
            fileName: file.name,
            buffer,
          });

          row.fileUrl = filePath;
          row.fileName = file.name;
          row.fileUploadedAt = new Date();
        }
      }
    }

    const serialNumber = await getNextYearwiseSerial(
      "AUDIT_INSPECTION_PLANNER",
      yearNum
    );

    const createPayload = {
      issueDate,
      approvedBy,
      categories,
      status: "Draft",
      version: "1.0",
      year: yearNum,
      serialNumber,
    };

    let record;
    try {
      record = await AuditInspectionPlanner.create(createPayload);
    } catch (createErr) {
      const isFormCodeDup =
        createErr.code === 11000 &&
        (createErr.message || "").includes("formCode");
      if (isFormCodeDup) {
        try {
          await AuditInspectionPlanner.collection.dropIndex("formCode_1");
        } catch (dropErr) {
          console.warn("Drop formCode_1 index:", dropErr.message);
        }
        record = await AuditInspectionPlanner.create(createPayload);
      } else {
        throw createErr;
      }
    }

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("Create Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
