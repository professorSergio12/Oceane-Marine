import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";

export async function PUT(req, { params }) {
  await connectDB();
  const { id } = await params;

  try {
    const existing = await StsOperation.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    if (!existing.isLatest) {
      return NextResponse.json(
        { error: "Only latest version can be updated" },
        { status: 403 }
      );
    }

    // Check if operation is submitted - if yes, lock it from updates
    if (existing.isSubmitted) {
      return NextResponse.json(
        { error: "Operation has been submitted and cannot be updated" },
        { status: 403 }
      );
    }

    const formData = await req.formData();

    const body = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") body[key] = value;
    });

    // File fields are now strings (URLs/paths) - no upload needed
    const uploadedFiles = {};
    
    // List of file fields that should be stored as strings (URLs)
    const FILE_URL_FIELDS = [
      "jpo",
      "stblSSQ",
      "ssSSQ",
      "stblIndemnity",
      "ssIndemnity",
      "standingOrder",
      "stsEquipChecklistPriorOps",
      "stsEquipChecklistAfterOps",
      "checklist1",
      "checklist2",
      "checklist3AB",
      "checklist4AF",
      "checklist5AC",
      "checklist6AB",
      "checklist7",
      "stblMasterFeedback",
      "ssMasterFeedback",
      "stsTimesheet",
      "hourlyChecks",
      "incidentReporting",
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
      "riskAssessment",
      "mooringPlan",
      "DeclarationAtSea",
      "chsFeedback",
      "msFeedback",
      "restHoursCKL",
    ];

    // Extract file URLs from body (they come as strings now)
    for (const field of FILE_URL_FIELDS) {
      if (body[field] && typeof body[field] === "string" && body[field].trim() !== "") {
        uploadedFiles[field] = body[field].trim();
      }
    }

    // GET LAST VERSION OF THIS OPERATION
    const lastVersion = await StsOperation.findOne({
      parentOperationId: existing.parentOperationId,
    }).sort({ version: -1 });

    const newVersionNumber = Number((lastVersion.version + 0.1).toFixed(1));

    // Mark previous versions as NOT latest
    await StsOperation.updateMany(
      { parentOperationId: existing.parentOperationId },
      { $set: { isLatest: false } }
    );

    // Handle submission status
    const isSubmitted = body.isSubmitted === "true" || body.isSubmitted === true;
    const submittedAt = isSubmitted && body.submittedAt ? new Date(body.submittedAt) : null;

    // CREATE NEW VERSION ENTRY
    const newVersion = await StsOperation.create({
      ...existing.toObject(),
      ...body,
      ...uploadedFiles,
      _id: undefined, // important: create new document, NOT overwrite
      version: newVersionNumber,
      isLatest: true,
      isSubmitted: isSubmitted || existing.isSubmitted, // Preserve if already submitted
      submittedAt: submittedAt || existing.submittedAt, // Preserve if already submitted
    });

    return NextResponse.json({
      success: true,
      message: "New version created",
      data: newVersion,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
