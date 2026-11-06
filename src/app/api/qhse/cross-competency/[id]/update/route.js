import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import PoacCrossCompetency from "@/lib/mongodb/models/qhse-poac/PoacCrossCompetency";
import {
  POAC_EVALUATION_ITEMS,
  normalizePoacEvaluation,
} from "@/lib/constants/qhse-poac/poacEvaluationItems";
import { saveBase64AsFile, isBase64DataUrl } from "@/lib/utils/qhse-file-storage";
import { getNextRevisionNumber } from "@/lib/utils/qhse-revision";
import { notifyEdit } from "@/lib/notifications/moduleNotify";

export async function PUT(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
    const body = await req.json();

    /* =========================
       FIND EXISTING FORM
       ========================= */
    const existingForm = await PoacCrossCompetency.findById(id);

    if (!existingForm) {
      return NextResponse.json(
        { success: false, error: "POAC form not found" },
        { status: 404 }
      );
    }

    /* =========================
       CHECK IF LATEST VERSION
       ========================= */
    if (!existingForm.isLatest) {
      return NextResponse.json(
        { success: false, error: "Only latest version can be updated" },
        { status: 403 }
      );
    }

    /* =========================
       VALIDATE REQUIRED FIELDS (if provided)
       ========================= */
    if (body.nameOfPOAC !== undefined && !body.nameOfPOAC?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name of POAC cannot be empty" },
        { status: 400 }
      );
    }

    if (body.evaluationDate !== undefined && !body.evaluationDate) {
      return NextResponse.json(
        { success: false, error: "Evaluation date is required" },
        { status: 400 }
      );
    }

    if (body.jobRefNo !== undefined && !body.jobRefNo?.trim()) {
      return NextResponse.json(
        { success: false, error: "Job Ref No cannot be empty" },
        { status: 400 }
      );
    }

    if (body.leadPOAC !== undefined && !body.leadPOAC?.trim()) {
      return NextResponse.json(
        { success: false, error: "Lead POAC cannot be empty" },
        { status: 400 }
      );
    }

    /* =========================
       BUILD EVALUATION ITEMS (ALL 75)
       ========================= */
    let finalEvaluationItems;

    if (
      body.evaluationItems &&
      Array.isArray(body.evaluationItems) &&
      body.evaluationItems.length > 0
    ) {
      // User provided items - merge with constant
      const itemMap = new Map(body.evaluationItems.map((item) => [item.srNo, item]));

      finalEvaluationItems = POAC_EVALUATION_ITEMS.map((master) => {
        const userItem = itemMap.get(master.srNo);
        const existingItem = existingForm.evaluationItems?.find(
          (e) => e.srNo === master.srNo
        );

        return {
          srNo: master.srNo,
          area: master.area,
          // A row sent without a rating is cleared; only rows not sent keep the saved value
          evaluation: normalizePoacEvaluation(
            userItem ? userItem.evaluation : existingItem?.evaluation
          ),
          remarks: userItem?.remarks ?? existingItem?.remarks ?? "",
        };
      });
    } else {
      // Use existing evaluation items if not provided
      finalEvaluationItems = POAC_EVALUATION_ITEMS.map((master) => {
        const existingItem = existingForm.evaluationItems?.find(
          (e) => e.srNo === master.srNo
        );
        return {
          srNo: master.srNo,
          area: master.area,
          evaluation: normalizePoacEvaluation(existingItem?.evaluation),
          remarks: existingItem?.remarks ?? "",
        };
      });
    }

    /* =========================
       REVISION: 1.0 -> 1.1 -> 1.2 on each update; revDate = now
       ========================= */
    const newRevNo = getNextRevisionNumber(existingForm.revNo || "1.0");
    const now = new Date();

    /* =========================
       SIGNATURES: images are stored as files, like on create
       ========================= */
    const signatureValue = async (field, fileName) => {
      if (body[field] === undefined) return existingForm[field];
      const value = body[field]?.trim() || "";
      if (!isBase64DataUrl(value)) return value;
      const saved = await saveBase64AsFile({
        formCode: existingForm.formCode,
        formSlug: "cross-competency",
        location: (body.location ?? existingForm.location)?.trim() || null,
        date: body.evaluationDate ? new Date(body.evaluationDate) : existingForm.evaluationDate,
        title: (body.nameOfPOAC || existingForm.nameOfPOAC).trim(),
        fileType: "signatures",
        fileName,
        base64DataUrl: value,
      });
      return saved || value;
    };

    /* =========================
       CREATE NEW VERSION
       The current version stays latest until the new one is saved, so a failed save
       cannot leave the form without a latest version (it would vanish from the list).
       ========================= */
    const updatedForm = await PoacCrossCompetency.create({
      // Versioning
      parentOperationId: existingForm.parentOperationId,
      isLatest: false,

      // Same document across revisions: keep its code and serial
      formCode: existingForm.formCode,
      serialNumber: existingForm.serialNumber,

      // Required fields (allow update)
      nameOfPOAC: body.nameOfPOAC?.trim() || existingForm.nameOfPOAC,
      evaluationDate: body.evaluationDate
        ? new Date(body.evaluationDate)
        : existingForm.evaluationDate,
      jobRefNo: body.jobRefNo?.trim() || existingForm.jobRefNo,
      leadPOAC: body.leadPOAC?.trim() || existingForm.leadPOAC,

      // Optional fields
      dischargingVessel:
        body.dischargingVessel !== undefined
          ? body.dischargingVessel?.trim() || ""
          : existingForm.dischargingVessel,
      receivingVessel:
        body.receivingVessel !== undefined
          ? body.receivingVessel?.trim() || ""
          : existingForm.receivingVessel,
      location:
        body.location !== undefined
          ? body.location?.trim() || ""
          : existingForm.location,
      typeOfOperation:
        body.typeOfOperation !== undefined
          ? body.typeOfOperation?.trim() || ""
          : existingForm.typeOfOperation,
      weatherCondition:
        body.weatherCondition !== undefined
          ? body.weatherCondition?.trim() || ""
          : existingForm.weatherCondition,
      deadweightDischarging:
        body.deadweightDischarging !== undefined
          ? body.deadweightDischarging
          : existingForm.deadweightDischarging,
      deadweightReceiving:
        body.deadweightReceiving !== undefined
          ? body.deadweightReceiving
          : existingForm.deadweightReceiving,

      // Revision: only set on update (1.1, 1.2, ...); revDate = date of this update; approvedBy set when approved in main app
      revNo: newRevNo,
      revDate: now,
      approvedBy:
        body.approvedBy !== undefined
          ? body.approvedBy?.trim() || ""
          : existingForm.approvedBy,

      // Evaluation items (all 75)
      evaluationItems: finalEvaluationItems,

      // Lead POAC Comments & Signatures
      leadPOACComment:
        body.leadPOACComment !== undefined
          ? body.leadPOACComment?.trim() || ""
          : existingForm.leadPOACComment,
      leadPOACName:
        body.leadPOACName !== undefined
          ? body.leadPOACName?.trim() || ""
          : existingForm.leadPOACName,
      leadPOACDate: body.leadPOACDate
        ? new Date(body.leadPOACDate)
        : existingForm.leadPOACDate,
      leadPOACSignature: await signatureValue("leadPOACSignature", "lead-poac-signature"),

      // Operations Support Team Comment
      opsSupportTeamComment:
        body.opsSupportTeamComment !== undefined
          ? body.opsSupportTeamComment?.trim() || ""
          : existingForm.opsSupportTeamComment,

      // Ops Team Section
      opsTeamName:
        body.opsTeamName !== undefined
          ? body.opsTeamName?.trim() || ""
          : existingForm.opsTeamName,
      opsTeamDate: body.opsTeamDate
        ? new Date(body.opsTeamDate)
        : existingForm.opsTeamDate,
      opsTeamSignature: await signatureValue("opsTeamSignature", "ops-team-signature"),

      // Ops Team Superintendent Section
      opsTeamSupdtName:
        body.opsTeamSupdtName !== undefined
          ? body.opsTeamSupdtName?.trim() || ""
          : existingForm.opsTeamSupdtName,
      opsTeamSupdtDate: body.opsTeamSupdtDate
        ? new Date(body.opsTeamSupdtDate)
        : existingForm.opsTeamSupdtDate,
      opsTeamSupdtSignature: await signatureValue("opsTeamSupdtSignature", "ops-team-supdt-signature"),

      // Status
      status: body.status || existingForm.status || "Draft",

      // User tracking
      createdBy: existingForm.createdBy,
      updatedBy: req.user?.id || null,
    });

    /* =========================
       MAKE THE NEW VERSION THE LATEST
       ========================= */
    await PoacCrossCompetency.updateMany(
      { parentOperationId: existingForm.parentOperationId, _id: { $ne: updatedForm._id } },
      { $set: { isLatest: false } }
    );
    await PoacCrossCompetency.updateOne({ _id: updatedForm._id }, { $set: { isLatest: true } });
    updatedForm.isLatest = true;

    void notifyEdit("QHSE", "cross-competency · update", id);
    return NextResponse.json(
      {
        success: true,
        message: "New version created successfully",
        data: updatedForm,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POAC UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update POAC form",
      },
      { status: 500 }
    );
  }
}
