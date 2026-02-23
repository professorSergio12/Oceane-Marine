import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import ShipStandardQuestionnaire from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-001-A";
import { incrementRevisionForUpdate } from "../../../revision";
import fs from "fs/promises";
import path from "path";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const formData = await req.formData();
    const dataStr = formData.get("data");

    if (!dataStr) {
      return NextResponse.json(
        { error: "Form data is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = JSON.parse(dataStr);

    // Get existing questionnaire
    const existing = await ShipStandardQuestionnaire.findById(id).lean();

    if (!existing) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Handle signature file upload if provided
    const signatureFile = formData.get("signature");
    let signatureUrl = body.signature?.signature || existing.signature?.signature;

    if (signatureFile && typeof signatureFile !== "string" && signatureFile.name) {
      const bytes = await signatureFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const uploadDir = path.join(
        process.cwd(),
        `public/signature/operation-sts-checklist/${year}/${month}/${day}/OPS-OFD-001A`
      );
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `${Date.now()}-${signatureFile.name}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.writeFile(filePath, buffer);
      signatureUrl = `/signature/operation-sts-checklist/${year}/${month}/${day}/OPS-OFD-001A/${fileName}`;
    }

    // Prepare update data
    const updateData = {
      documentInfo: {
        formNo: body.formNo || existing.documentInfo?.formNo || "OPS-OFD-001A",
        revisionNo: incrementRevisionForUpdate(existing.documentInfo?.revisionNo),
        revisionDate: body.revisionDate
          ? new Date(body.revisionDate)
          : existing.documentInfo?.revisionDate,
        approvedBy: body.approvedBy || existing.documentInfo?.approvedBy || "JS",
      },
      basicInfo: {
        proposedLocation: body.proposedLocation || existing.basicInfo?.proposedLocation || "",
        shipName: body.shipName || existing.basicInfo?.shipName || "",
        date: body.date ? new Date(body.date) : existing.basicInfo?.date,
      },
      responses: body.responses || existing.responses || {},
      signature: {
        name: body.signature?.name || existing.signature?.name || "",
        rank: body.signature?.rank || existing.signature?.rank || "",
        signature: signatureUrl || "",
        date: body.signature?.date
          ? new Date(body.signature.date)
          : existing.signature?.date,
      },
      status: body.status || existing.status || "DRAFT",
      createdBy: body.createdBy || existing.createdBy || undefined,
    };

    const updatedQuestionnaire = await ShipStandardQuestionnaire.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      {
        message: "OPS-OFD-001A questionnaire updated successfully",
        data: updatedQuestionnaire,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("OPS-OFD-001A update error:", error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
