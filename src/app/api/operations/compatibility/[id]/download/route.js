import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import { loadMergedCompatibility } from "@/lib/operations/compatibilityGroup";
import { sanitizeCompatibilityFilename } from "@/lib/operations/compatibilityDocumentValues";
import { fillCompatibilityDocx } from "@/lib/operations/fillCompatibilityDocx";

export const maxDuration = 60;

export async function GET(req, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    // Hose + fender of the same operation in one file
    const doc = await loadMergedCompatibility(id);
    if (!doc) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    let out;
    try {
      out = await fillCompatibilityDocx(doc);
    } catch {
      return NextResponse.json(
        { error: "Compatibility template not found on server" },
        { status: 500 }
      );
    }

    const fileName = `Compatibility-${sanitizeCompatibilityFilename(doc.operationNumber)}.docx`;

    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(out.length),
      },
    });
  } catch (error) {
    console.error("Compatibility download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate document" },
      { status: 500 }
    );
  }
}
