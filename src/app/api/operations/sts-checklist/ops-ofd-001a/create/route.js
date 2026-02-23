import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import ShipStandardQuestionnaire from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-001-A";
import { getNextRevisionForCreate } from "../../revision";
import fs from "fs/promises";
import path from "path";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();
    const dataStr = formData.get("data");
    
    if (!dataStr) {
      return NextResponse.json(
        { error: "Form data is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = JSON.parse(dataStr);

    // Handle signature file upload if provided
    const signatureFile = formData.get("signature");
    let signatureUrl = body.signature?.signature;

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

    const revisionNo = await getNextRevisionForCreate(ShipStandardQuestionnaire);

    // Prepare the document data - map frontend fields to schema
    const documentData = {
      documentInfo: {
        formNo: body.formNo || "OPS-OFD-001A",
        revisionNo,
        revisionDate: body.revisionDate ? new Date(body.revisionDate) : undefined,
        approvedBy: body.approvedBy || "JS",
      },
      basicInfo: {
        proposedLocation: body.proposedLocation || "",
        shipName: body.shipName || "",
        date: body.date ? new Date(body.date) : undefined,
      },
      responses: body.responses || {},
      signature: {
        name: body.signature?.name || "",
        rank: body.signature?.rank || "",
        signature: signatureUrl || "",
        date: body.signature?.date ? new Date(body.signature.date) : undefined,
      },
      status: body.status || "DRAFT",
      createdBy: body.createdBy || undefined,
    };

    const newQuestionnaire = await ShipStandardQuestionnaire.create(documentData);

    return NextResponse.json(
      {
        message: "OPS-OFD-001A questionnaire created successfully",
        data: newQuestionnaire,
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("OPS-OFD-001A create error:", error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
