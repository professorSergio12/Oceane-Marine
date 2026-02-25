import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Jpo from "@/lib/mongodb/models/operations-form-checklist/Jpo";
import RiskAssessment from "@/lib/mongodb/models/qhse-risk-assessment/RiskAssessment";

/**
 * GET /api/operations/sts/pre-sts-docs?locationId=xxx&locationName=xxx
 *
 * Returns the latest JPO and Risk Assessment file paths
 * for the given location so they can be auto-filled in the
 * STS Operation Pre-STS Documents section.
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

    const result = { jpo: null, riskAssessment: null };

    // Fetch latest JPO for this location (by locationId)
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

    // Fetch latest Risk Assessment for this location (by locationName)
    if (locationName) {
      const latestRA = await RiskAssessment.findOne({
        locationName: locationName,
      })
        .sort({ assessmentDate: -1, createdAt: -1 })
        .lean();

      if (latestRA?.filePath) {
        result.riskAssessment = latestRA.filePath;
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
