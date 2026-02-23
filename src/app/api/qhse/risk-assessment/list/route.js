import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import RiskAssessment from "@/lib/mongodb/models/qhse-risk-assessment/RiskAssessment";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const yearParam = searchParams.get("year");
    const query = {};
    if (location && location.trim()) {
      query.locationName = location.trim();
    }
    if (yearParam) {
      const year = Number.parseInt(yearParam, 10);
      if (!Number.isNaN(year)) {
        const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
        const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);
        query.$or = [
          { assessmentDate: { $gte: yearStart, $lte: yearEnd } },
          { assessmentDate: { $exists: false }, createdAt: { $gte: yearStart, $lte: yearEnd } },
          { assessmentDate: null, createdAt: { $gte: yearStart, $lte: yearEnd } },
        ];
      }
    }
    const items = await RiskAssessment.find(query).sort({ assessmentDate: -1, createdAt: -1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}