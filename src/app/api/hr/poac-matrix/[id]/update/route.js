import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import PoacMatrix from "@/lib/mongodb/models/hr/PoacMatrix";
import path from "path";
import fs from "fs/promises";

/* Fields that can have a conditional file upload when set to "Yes" */
const OPTION_FILE_FIELDS = [
  "validPassport",
  "validMastersCOC",
  "dangerousCargoEndorsementOil",
  "dangerousCargoEndorsementChem",
  "dangerousCargoEndorsementGas",
  "oilSpillResponseTraining",
  "stsSimulatorTraining",
  "vesselSizeLimitations",
  "underwayOperations",
  "validMedicals",
];

const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, "_");

async function deleteFileIfExists(fileUrl) {
  if (!fileUrl) return;
  try {
    const filePath = path.join(process.cwd(), "public", fileUrl);
    await fs.unlink(filePath).catch(() => {});
  } catch (err) {
    console.error("Error deleting file:", err);
  }
}

async function saveFile(file, stsServiceProvider, poacName, subfolder) {
  const sanitizedProvider = sanitize(stsServiceProvider.trim());
  const sanitizedName = sanitize(poacName.trim());

  const baseDir = path.join(
    process.cwd(),
    "public/uploads/hr/poac-matrix",
    sanitizedProvider,
    sanitizedName,
    subfolder
  );
  await fs.mkdir(baseDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${sanitize(file.name)}`;
  const filePath = path.join(baseDir, fileName);
  await fs.writeFile(filePath, buffer);

  return {
    fileUrl: `/uploads/hr/poac-matrix/${sanitizedProvider}/${sanitizedName}/${subfolder}/${fileName}`,
    originalFileName: file.name,
  };
}

export async function PUT(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const formData = await req.formData();

    const existingRecord = await PoacMatrix.findById(id);
    if (!existingRecord) {
      return NextResponse.json({ message: "POAC Matrix record not found" }, { status: 404 });
    }

    const rowsData = [];
    let rowIndex = 0;

    while (true) {
      const stsServiceProvider = formData.get(`row_${rowIndex}_stsServiceProvider`);
      if (!stsServiceProvider) break;

      const poacName = formData.get(`row_${rowIndex}_poacName`);
      const validPassport = formData.get(`row_${rowIndex}_validPassport`) || "No";
      const validMastersCOC = formData.get(`row_${rowIndex}_validMastersCOC`) || "No";
      const dangerousCargoEndorsementOil = formData.get(`row_${rowIndex}_dangerousCargoEndorsementOil`) || "No";
      const dangerousCargoEndorsementChem = formData.get(`row_${rowIndex}_dangerousCargoEndorsementChem`) || "No";
      const dangerousCargoEndorsementGas = formData.get(`row_${rowIndex}_dangerousCargoEndorsementGas`) || "No";
      const oilSpillResponseTraining = formData.get(`row_${rowIndex}_oilSpillResponseTraining`) || "No";
      const stsSimulatorTraining = formData.get(`row_${rowIndex}_stsSimulatorTraining`) || "No";
      const vesselSizeLimitations = formData.get(`row_${rowIndex}_vesselSizeLimitations`) || "No";
      const underwayOperations = formData.get(`row_${rowIndex}_underwayOperations`) || "No";
      const validMedicals = formData.get(`row_${rowIndex}_validMedicals`) || "No";
      const experienceWithOceane = formData.get(`row_${rowIndex}_experienceWithOceane`);
      const remarks = formData.get(`row_${rowIndex}_remarks`) || "";
      const attachment = formData.get(`row_${rowIndex}_attachment`);

      // Validate required fields
      if (!stsServiceProvider || !stsServiceProvider.trim()) {
        return NextResponse.json({ message: `Row ${rowIndex + 1}: STS Service Provider is required` }, { status: 400 });
      }
      if (!poacName || !poacName.trim()) {
        return NextResponse.json({ message: `Row ${rowIndex + 1}: POAC's Name is required` }, { status: 400 });
      }
      if (!["Yes", "No"].includes(validPassport)) {
        return NextResponse.json({ message: `Row ${rowIndex + 1}: Valid Passport must be Yes or No` }, { status: 400 });
      }
      if (!["Yes", "No"].includes(validMastersCOC)) {
        return NextResponse.json({ message: `Row ${rowIndex + 1}: Valid Master's COC must be Yes or No` }, { status: 400 });
      }
      if (!experienceWithOceane || !experienceWithOceane.trim()) {
        return NextResponse.json({ message: `Row ${rowIndex + 1}: Experience with Oceane is required` }, { status: 400 });
      }

      // Get existing row data for preserving files
      const existingRow = existingRecord.rows[rowIndex];

      // Handle main attachment (preserve existing if no new file)
      let attachmentData = existingRow?.attachment || { fileUrl: "", originalFileName: "" };
      if (attachment && typeof attachment !== "string" && attachment.name && attachment.size > 0) {
        await deleteFileIfExists(existingRow?.attachment?.fileUrl);
        attachmentData = await saveFile(attachment, stsServiceProvider, poacName, "main");
      }

      // Build option values map
      const optionValues = {
        validPassport,
        validMastersCOC,
        dangerousCargoEndorsementOil,
        dangerousCargoEndorsementChem,
        dangerousCargoEndorsementGas,
        oilSpillResponseTraining,
        stsSimulatorTraining,
        vesselSizeLimitations,
        underwayOperations,
        validMedicals,
      };

      // Handle per-option file uploads
      const optionFileData = {};
      for (const field of OPTION_FILE_FIELDS) {
        const fileKey = `${field}File`;
        const existingFileData = existingRow?.[fileKey] || { fileUrl: "", originalFileName: "" };

        if (optionValues[field] === "Yes") {
          // Option is Yes — check for new file upload
          const optionFile = formData.get(`row_${rowIndex}_${fileKey}`);
          if (optionFile && typeof optionFile !== "string" && optionFile.name && optionFile.size > 0) {
            // New file uploaded — delete old and save new
            await deleteFileIfExists(existingFileData?.fileUrl);
            optionFileData[fileKey] = await saveFile(optionFile, stsServiceProvider, poacName, field);
          } else {
            // No new file — preserve existing
            optionFileData[fileKey] = existingFileData;
          }
        } else {
          // Option changed to "No" — delete existing file if any
          await deleteFileIfExists(existingFileData?.fileUrl);
          optionFileData[fileKey] = { fileUrl: "", originalFileName: "" };
        }
      }

      rowsData.push({
        stsServiceProvider: stsServiceProvider.trim(),
        poacName: poacName.trim(),
        ...optionValues,
        ...optionFileData,
        experienceWithOceane: experienceWithOceane.trim(),
        remarks: remarks ? remarks.trim() : "",
        attachment: attachmentData,
      });

      rowIndex++;
    }

    if (rowsData.length === 0) {
      return NextResponse.json({ message: "At least one row is required" }, { status: 400 });
    }

    // Delete old files for removed rows
    if (existingRecord.rows.length > rowsData.length) {
      for (let i = rowsData.length; i < existingRecord.rows.length; i++) {
        const oldRow = existingRecord.rows[i];
        // Delete main attachment
        await deleteFileIfExists(oldRow?.attachment?.fileUrl);
        // Delete per-option files
        for (const field of OPTION_FILE_FIELDS) {
          await deleteFileIfExists(oldRow?.[`${field}File`]?.fileUrl);
        }
      }
    }

    const updatedRecord = await PoacMatrix.findByIdAndUpdate(id, { rows: rowsData }, { new: true });
    return NextResponse.json({ data: updatedRecord }, { status: 200 });
  } catch (err) {
    console.error("POAC Matrix update error:", err);
    return NextResponse.json({ message: err.message || "Update failed", error: err.message }, { status: 500 });
  }
}
