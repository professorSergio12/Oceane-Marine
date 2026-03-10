import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import PoacMatrix from "@/lib/mongodb/models/hr/PoacMatrix";
import path from "path";
import fs from "fs/promises";

export async function PUT(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const formData = await req.formData();

    // Find existing record
    const existingRecord = await PoacMatrix.findById(id);
    if (!existingRecord) {
      return NextResponse.json(
        { message: "POAC Matrix record not found" },
        { status: 404 }
      );
    }

    // Get rows data - formData will have rows as row_0_field, row_1_field, etc.
    const rowsData = [];
    let rowIndex = 0;
    
    while (true) {
      const stsServiceProvider = formData.get(`row_${rowIndex}_stsServiceProvider`);
      if (!stsServiceProvider) break; // No more rows
      
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
        return NextResponse.json(
          { message: `Row ${rowIndex + 1}: STS Service Provider is required` },
          { status: 400 }
        );
      }
      if (!poacName || !poacName.trim()) {
        return NextResponse.json(
          { message: `Row ${rowIndex + 1}: POAC's Name is required` },
          { status: 400 }
        );
      }
      if (!["Yes", "No"].includes(validPassport)) {
        return NextResponse.json(
          { message: `Row ${rowIndex + 1}: Valid Passport must be Yes or No` },
          { status: 400 }
        );
      }
      if (!["Yes", "No"].includes(validMastersCOC)) {
        return NextResponse.json(
          { message: `Row ${rowIndex + 1}: Valid Master's COC must be Yes or No` },
          { status: 400 }
        );
      }
      if (!experienceWithOceane || !experienceWithOceane.trim()) {
        return NextResponse.json(
          { message: `Row ${rowIndex + 1}: Experience with Oceane is required` },
          { status: 400 }
        );
      }

      // Get existing row data if available (for preserving old file if new one not provided)
      const existingRow = existingRecord.rows[rowIndex];
      let attachmentData = existingRow?.attachment || { fileUrl: "", originalFileName: "" };

      // Handle file upload if new file is provided
      if (attachment && typeof attachment !== "string" && attachment.name && attachment.size > 0) {
        // Delete old file if exists
        if (existingRow?.attachment?.fileUrl) {
          try {
            const oldFilePath = path.join(process.cwd(), "public", existingRow.attachment.fileUrl);
            await fs.unlink(oldFilePath).catch(() => {}); // Ignore if file doesn't exist
          } catch (err) {
            console.error("Error deleting old file:", err);
          }
        }

        const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, "_");
        const sanitizedProvider = sanitize(stsServiceProvider.trim());
        const sanitizedName = sanitize(poacName.trim());

        const baseDir = path.join(
          process.cwd(),
          "public/uploads/hr/poac-matrix",
          sanitizedProvider,
          sanitizedName
        );
        await fs.mkdir(baseDir, { recursive: true });

        const attachmentBuffer = Buffer.from(await attachment.arrayBuffer());
        const attachmentFileName = `${Date.now()}-${sanitize(attachment.name)}`;
        const attachmentFilePath = path.join(baseDir, attachmentFileName);
        await fs.writeFile(attachmentFilePath, attachmentBuffer);
        const attachmentFileUrl = `/uploads/hr/poac-matrix/${sanitizedProvider}/${sanitizedName}/${attachmentFileName}`;

        attachmentData = {
          fileUrl: attachmentFileUrl,
          originalFileName: attachment.name,
        };
      }

      rowsData.push({
        stsServiceProvider: stsServiceProvider.trim(),
        poacName: poacName.trim(),
        validPassport: validPassport || "No",
        validMastersCOC: validMastersCOC || "No",
        dangerousCargoEndorsementOil: dangerousCargoEndorsementOil || "No",
        dangerousCargoEndorsementChem: dangerousCargoEndorsementChem || "No",
        dangerousCargoEndorsementGas: dangerousCargoEndorsementGas || "No",
        oilSpillResponseTraining: oilSpillResponseTraining || "No",
        stsSimulatorTraining: stsSimulatorTraining || "No",
        vesselSizeLimitations: vesselSizeLimitations || "No",
        underwayOperations: underwayOperations || "No",
        validMedicals: validMedicals || "No",
        experienceWithOceane: experienceWithOceane.trim(),
        remarks: remarks ? remarks.trim() : "",
        attachment: attachmentData,
      });

      rowIndex++;
    }

    if (rowsData.length === 0) {
      return NextResponse.json(
        { message: "At least one row is required" },
        { status: 400 }
      );
    }

    // Delete old files for rows that were removed
    if (existingRecord.rows.length > rowsData.length) {
      for (let i = rowsData.length; i < existingRecord.rows.length; i++) {
        const oldRow = existingRecord.rows[i];
        if (oldRow?.attachment?.fileUrl) {
          try {
            const oldFilePath = path.join(process.cwd(), "public", oldRow.attachment.fileUrl);
            await fs.unlink(oldFilePath).catch(() => {});
          } catch (err) {
            console.error("Error deleting old file:", err);
          }
        }
      }
    }

    const updatedRecord = await PoacMatrix.findByIdAndUpdate(
      id,
      { rows: rowsData },
      { new: true }
    );

    return NextResponse.json({ data: updatedRecord }, { status: 200 });
  } catch (err) {
    console.error("POAC Matrix update error:", err);
    return NextResponse.json(
      { message: err.message || "Update failed", error: err.message },
      { status: 500 }
    );
  }
}
