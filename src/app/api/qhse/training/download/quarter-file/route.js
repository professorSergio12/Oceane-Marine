import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import TrainingPlan from "@/lib/mongodb/models/qhse-training/TrainingPlan";
import fs from "fs";
import path from "path";

const MIME_TYPES = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const monthPair = searchParams.get("monthPair");

    if (!planId || !monthPair) {
      return NextResponse.json(
        { success: false, error: "planId and monthPair are required" },
        { status: 400 }
      );
    }

    const validMonthPairs = ["Jan-Feb", "Mar-Apr", "May-Jun", "Jul-Aug", "Sep-Oct", "Nov-Dec"];
    if (!validMonthPairs.includes(monthPair)) {
      return NextResponse.json(
        { success: false, error: `Invalid month pair. Must be one of: ${validMonthPairs.join(", ")}` },
        { status: 400 }
      );
    }

    const plan = await TrainingPlan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Training plan not found" },
        { status: 404 }
      );
    }

    const monthPairFile = plan.monthPairFiles?.[monthPair];
    if (!monthPairFile || !monthPairFile.filePath) {
      return NextResponse.json(
        { success: false, error: `No file found for ${monthPair}` },
        { status: 404 }
      );
    }

    const storedPath = monthPairFile.filePath;
    const fileName = monthPairFile.fileName || `training-matrix-${monthPair}.pdf`;

    // Check if the stored path is a Cloudinary URL (legacy) or a local path (new)
    if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
      const fileResponse = await fetch(storedPath);
      if (!fileResponse.ok) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch file from storage" },
          { status: 500 }
        );
      }
      const fileBuffer = await fileResponse.arrayBuffer();
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": fileResponse.headers.get("content-type") || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // Local file path
    const absolutePath = path.join(process.cwd(), storedPath);
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { success: false, error: "File not found on disk" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Download Month Pair File Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
