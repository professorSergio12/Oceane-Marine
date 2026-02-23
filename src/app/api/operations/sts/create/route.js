import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import mongoose from "mongoose";

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();

    /* =====================
       EXTRACT TEXT FIELDS (including file URLs as strings)
    ====================== */
    const body = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") {
        body[key] = value;
      }
    });

    // File fields are now strings (URLs/paths) - no upload needed
    // These fields will be stored directly as strings in the database
    const uploadedFiles = {};
    
    // List of file fields that should be stored as strings (URLs)
    const FILE_URL_FIELDS = [
      "chsSSQ",
      "chsQ88",
      "chsGAPlan",
      "chsMSDS",
      "chsMooringArrangement",
      "chsIndemnity",
      "msSSQ",
      "msQ88",
      "msGAPlan",
      "msMSDS",
      "msMooringArrangement",
      "msIndemnity",
      "jpo",
      "riskAssessment",
      "mooringPlan",
      "DeclarationAtSea",
      "checklist1",
      "checklist2",
      "checklist3AB",
      "checklist4AF",
      "checklist5AC",
      "checklist6AB",
      "checklist7",
      "stsTimesheet",
      "standingOrder",
      "stsEquipChecklistPriorOps",
      "stsEquipChecklistAfterOps",
      "chsFeedback",
      "msFeedback",
      "hourlyChecks",
      "restHoursCKL",
      "incidentReporting",
    ];

    // Extract file URLs from body (they come as strings now)
    for (const field of FILE_URL_FIELDS) {
      if (body[field] && typeof body[field] === "string" && body[field].trim() !== "") {
        uploadedFiles[field] = body[field].trim();
      }
    }

    /* =====================
       EQUIPMENT VALIDATION
    ====================== */
    let equipmentIds = [];
    if (body.equipments) {
      try {
        equipmentIds = Array.isArray(body.equipments)
          ? body.equipments
          : JSON.parse(body.equipments);
      } catch (e) {
        equipmentIds = [body.equipments];
      }
    }

    let equipments = [];
    if (equipmentIds.length > 0) {
      equipments = await Equipment.find({
        _id: { $in: equipmentIds },
        isInUse: false,
      });

      if (equipments.length !== equipmentIds.length) {
        return NextResponse.json(
          { error: "One or more selected equipments are not available" },
          { status: 400 }
        );
      }
    }

    /* =====================
       OPERATION TIMES
    ====================== */
    const operationStartTime = body.operationStartTime
      ? new Date(body.operationStartTime)
      : new Date();
    const operationEndTime = body.operationEndTime
      ? new Date(body.operationEndTime)
      : null;

    /* =====================
       EQUIPMENT USAGE
    ====================== */
    const equipmentUsage = equipments.map((eq) => ({
      equipment: eq._id,
      startTime: operationStartTime,
      status: "IN_USE",
    }));

    /* =====================
       CREATE STS OPERATION
    ====================== */
    const parentOperationId = new mongoose.Types.ObjectId();

    // Ensure operationStatus is set (default to INPROGRESS for draft)
    const operationStatus = body.operationStatus || "INPROGRESS";
    
    // Handle submission status
    const isSubmitted = body.isSubmitted === "true" || body.isSubmitted === true;
    const submittedAt = isSubmitted && body.submittedAt ? new Date(body.submittedAt) : null;

    const stsOperation = await StsOperation.create({
      ...body,
      ...uploadedFiles,
      parentOperationId,
      equipments: equipmentUsage,
      operationStartTime,
      operationEndTime,
      operationStatus,
      isSubmitted,
      submittedAt,
      version: 1,
      isLatest: true,
    });

    /* =====================
       LOCK EQUIPMENTS
    ====================== */
    if (equipmentIds.length > 0) {
      await Equipment.updateMany(
        { _id: { $in: equipmentIds } },
        {
          isInUse: true,
          lastUsedAt: new Date(),
        }
      );
    }

    return NextResponse.json(
      {
        message: "STS Operation created successfully",
        data: stsOperation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("STS CREATE ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
