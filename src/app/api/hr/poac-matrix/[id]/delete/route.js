import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import PoacMatrix from "@/lib/mongodb/models/hr/PoacMatrix";
import path from "path";
import fs from "fs/promises";

// Helper: remove empty parent directories up to the "poac-matrix" folder
async function cleanEmptyDirs(dirPath) {
  const poacRoot = path.join(process.cwd(), "public/uploads/hr/poac-matrix");
  let current = dirPath;
  while (current !== poacRoot && current.startsWith(poacRoot)) {
    try {
      const entries = await fs.readdir(current);
      if (entries.length === 0) {
        await fs.rmdir(current);
        current = path.dirname(current);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    const record = await PoacMatrix.findById(id);
    if (!record) {
      return NextResponse.json(
        { message: "POAC Matrix record not found" },
        { status: 404 }
      );
    }

    // Delete all attached files from all rows and clean up empty directories
    const OPTION_FILE_FIELDS = [
      "validPassport", "validMastersCOC", "dangerousCargoEndorsementOil",
      "dangerousCargoEndorsementChem", "dangerousCargoEndorsementGas",
      "oilSpillResponseTraining", "stsSimulatorTraining", "vesselSizeLimitations",
      "underwayOperations", "validMedicals",
    ];

    if (record.rows && Array.isArray(record.rows)) {
      for (const row of record.rows) {
        // Delete all files in the attachments array (new multi-file format)
        if (row.attachments && Array.isArray(row.attachments)) {
          for (const att of row.attachments) {
            if (att?.fileUrl) {
              try {
                const filePath = path.join(process.cwd(), "public", att.fileUrl);
                await fs.unlink(filePath).catch(() => {});
                await cleanEmptyDirs(path.dirname(filePath));
              } catch (err) {
                console.error("Error deleting file:", err);
              }
            }
          }
        }
        // Also clean legacy single attachment
        if (row.attachment?.fileUrl) {
          try {
            const filePath = path.join(process.cwd(), "public", row.attachment.fileUrl);
            await fs.unlink(filePath).catch(() => {});
            await cleanEmptyDirs(path.dirname(filePath));
          } catch (err) {
            console.error("Error deleting file:", err);
          }
        }
        // Delete per-option files
        for (const field of OPTION_FILE_FIELDS) {
          const fileData = row[`${field}File`];
          if (fileData?.fileUrl) {
            try {
              const filePath = path.join(process.cwd(), "public", fileData.fileUrl);
              await fs.unlink(filePath).catch(() => {});
              await cleanEmptyDirs(path.dirname(filePath));
            } catch (err) {
              console.error("Error deleting file:", err);
            }
          }
        }
      }
    }

    // Delete record from database
    await PoacMatrix.findByIdAndDelete(id);

    return NextResponse.json({ message: "POAC Matrix record deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("POAC Matrix deletion error:", err);
    return NextResponse.json(
      { message: err.message || "Deletion failed", error: err.message },
      { status: 500 }
    );
  }
}
