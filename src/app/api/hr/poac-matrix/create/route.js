import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import PoacMatrix from "@/lib/mongodb/models/hr/PoacMatrix";
import path from "path";
import fs from "fs/promises";

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();
    
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

      let attachmentData = { fileUrl: "", originalFileName: "" };

      // Handle file upload if provided
      if (attachment && typeof attachment !== "string" && attachment.name && attachment.size > 0) {
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

    const poacMatrix = await PoacMatrix.create({
      rows: rowsData,
    });

    return NextResponse.json({ data: poacMatrix }, { status: 201 });
  } catch (err) {
    console.error("POAC Matrix creation error:", err);
    return NextResponse.json(
      { message: err.message || "Upload failed", error: err.message },
      { status: 500 }
    );
  }
}
