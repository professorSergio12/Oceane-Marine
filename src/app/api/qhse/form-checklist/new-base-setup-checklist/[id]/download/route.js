import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/config/connection";
import NewBaseSetupChecklist from "@/lib/mongodb/models/qhse-form-checklist/NewBaseSetupChecklist";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    const record = await NewBaseSetupChecklist.findById(id);

    if (!record) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const absolutePath = path.join(process.cwd(), record.filePath);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "File not found on server" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
