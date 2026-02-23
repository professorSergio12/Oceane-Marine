import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import TrainingRecord from "@/lib/mongodb/models/qhse-training/TrainingRecord";
import fs from "fs";
import path from "path";

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const record = await TrainingRecord.findById(id);

    if (!record) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 }
      );
    }

    if (!record.attachment?.filePath) {
      return NextResponse.json(
        { error: "No attachment found for this record" },
        { status: 404 }
      );
    }

    const absolutePath = path.join(process.cwd(), record.attachment.filePath);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "File not found on server" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = record.attachment.fileName || path.basename(absolutePath);
    const fileExt = path.extname(fileName).toLowerCase();

    const contentTypeMap = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    const contentType = contentTypeMap[fileExt] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Training Record Download Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
