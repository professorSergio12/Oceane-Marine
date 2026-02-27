import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Jpo from "@/lib/mongodb/models/operations-form-checklist/Jpo";
import RiskAssessment from "@/lib/mongodb/models/qhse-risk-assessment/RiskAssessment";
import NearMiss from "@/lib/mongodb/models/qhse-near-miss/NearMiss";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";

/**
 * GET /api/operations/sts/pre-sts-docs?locationId=xxx&locationName=xxx
 *
 * Returns:
 *  - jpo              : latest JPO file path for the location
 *  - riskAssessment   : latest Risk Assessment file path (kept for backward compat)
 *  - riskAssessments  : ALL Risk Assessments for the location
 *  - nearMissReports  : ALL Near Miss reports linked to operations at this location
 */
export async function GET(req) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const locationName = searchParams.get("locationName");

    if (!locationId && !locationName) {
      return NextResponse.json(
        { error: "locationId or locationName is required" },
        { status: 400 }
      );
    }

    const result = {
      jpo: null,
      riskAssessment: null,
      riskAssessments: [],
      nearMissReports: [],
    };

    // ── JPO (latest) ────────────────────────────────────────
    if (locationId) {
      const latestJpo = await Jpo.findOne({
        "location.locationId": locationId,
      })
        .sort({ uploadedAt: -1 })
        .lean();

      if (latestJpo?.filePath) {
        result.jpo = latestJpo.filePath;
      }
    }

    // ── Risk Assessments (ALL for this location) ────────────
    if (locationName) {
      const allRA = await RiskAssessment.find({
        locationName: locationName,
      })
        .sort({ assessmentDate: -1, createdAt: -1 })
        .lean();

      result.riskAssessments = allRA.map((ra) => ({
        _id: ra._id,
        formCode: ra.formCode || "",
        serialNumber: ra.serialNumber || "",
        locationName: ra.locationName,
        assessmentDate: ra.assessmentDate,
        version: ra.version,
        filePath: ra.filePath,
        fileName: ra.fileName,
      }));

      // Keep backward-compat single field (latest)
      if (allRA.length > 0 && allRA[0]?.filePath) {
        result.riskAssessment = allRA[0].filePath;
      }
    }

    // ── Near Miss Reports (ALL for operations at this location) ──
    if (locationId) {
      // Step 1 – Get all operation ref numbers for this location
      const ops = await StsOperation.find({
        location: locationId,
        isLatest: true,
      })
        .select("Operation_Ref_No")
        .lean();

      const opRefs = ops
        .map((o) => o.Operation_Ref_No)
        .filter(Boolean);

      // Step 2 – Find all near miss reports whose JobRefNo matches any op ref
      if (opRefs.length > 0) {
        const nearMisses = await NearMiss.find({
          JobRefNo: { $in: opRefs },
        })
          .sort({ timeOfIncident: -1, createdAt: -1 })
          .lean();

        result.nearMissReports = nearMisses.map((nm) => ({
          _id: nm._id,
          formCode: nm.formCode || "",
          serialNumber: nm.serialNumber || "",
          JobRefNo: nm.JobRefNo,
          VesselName: nm.VesselName,
          timeOfIncident: nm.timeOfIncident,
          NameOfObserver: nm.NameOfObserver,
          PositionOfObserver: nm.PositionOfObserver,
          TypeOfReporting: nm.TypeOfReporting,
          AreaOfNearMiss: nm.AreaOfNearMiss,
          Description: nm.Description,
          ImmediateCause: nm.ImmediateCause,
          RootCause: nm.RootCause,
          CorrectiveAction: nm.CorrectiveAction,
          status: nm.status,
        }));
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Pre-STS docs fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
