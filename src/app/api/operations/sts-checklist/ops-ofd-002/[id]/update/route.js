import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import STSChecklist2 from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-002";
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

    // Get existing checklist
    const existing = await STSChecklist2.findById(id).lean();

    if (!existing) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Handle signature file upload if provided
    const signatureFile = formData.get("signature");
    let signatureUrl = body.signatureBlock?.signature || existing.signatureBlock?.signature;

    if (signatureFile && typeof signatureFile !== "string" && signatureFile.name) {
      const bytes = await signatureFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const uploadDir = path.join(
        process.cwd(),
        `public/signature/operation-sts-checklist/${year}/${month}/${day}/OPS-OFD-002`
      );
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `${Date.now()}-${signatureFile.name}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.writeFile(filePath, buffer);
      signatureUrl = `/signature/operation-sts-checklist/${year}/${month}/${day}/OPS-OFD-002/${fileName}`;
    }

    const revisionNo = incrementRevisionForUpdate(existing.documentInfo?.revisionNo);

    // Prepare update data
    const updateData = {
      documentInfo: {
        formNo: body.formNo || existing.documentInfo?.formNo || "OPS-OFD-002",
        revisionNo,
        revisionDate: body.revisionDate
          ? new Date(body.revisionDate)
          : existing.documentInfo?.revisionDate,
        approvedBy: body.approvedBy || existing.documentInfo?.approvedBy || "JS",
      },
      transferInfo: {
        constantHeadingShip: body.constantHeadingShip || existing.transferInfo?.constantHeadingShip || "",
        manoeuvringShip: body.maneuveringShip || existing.transferInfo?.manoeuvringShip || "",
        designatedPOACName: body.nameOfDesignatedPOAC || existing.transferInfo?.designatedPOACName || "",
        stsSuperintendentName: body.nameOfSTSSuperintendent || existing.transferInfo?.stsSuperintendentName || "",
        transferDate: body.dateOfTransfer
          ? new Date(body.dateOfTransfer)
          : existing.transferInfo?.transferDate,
        transferLocation: body.locationOfTransfer || existing.transferInfo?.transferLocation || "",
      },
      checklistItems: (body.genericChecks || existing.checklistItems || []).map((check) => ({
        clNumber: check.id || check.clNumber,
        description: check.description || "",
        status: check.status ? "YES" : check.notApplicable ? "NOT_APPLICABLE" : "NO",
        remarks: check.userRemark || check.remarks || "",
      })),
      signatureBlock: {
        name: body.signature?.name || existing.signatureBlock?.name || "",
        rank: body.signature?.rank || existing.signatureBlock?.rank || "",
        signature: signatureUrl || "",
        date: body.signature?.date
          ? new Date(body.signature.date)
          : existing.signatureBlock?.date,
      },
      status: body.status || existing.status || "DRAFT",
      createdBy: body.createdBy || existing.createdBy || undefined,
    };

    const updatedChecklist = await STSChecklist2.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      {
        message: "OPS-OFD-002 checklist updated successfully",
        data: updatedChecklist,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("OPS-OFD-002 update error:", error);
    return NextResponse.json(
      { error: error.message },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
