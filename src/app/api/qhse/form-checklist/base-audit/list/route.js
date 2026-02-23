import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/config/connection";
import StsBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const locationId = searchParams.get("locationId");

    // Build query
    const query = {};
    
    // Filter by year if provided (use serialNumber year, e.g. 2028-001 -> 2028)
    if (year) {
      const yearNum = Number.parseInt(year, 10);
      if (!Number.isNaN(yearNum)) {
        query.serialNumber = new RegExp(`^${yearNum}-`);
      }
    }

    if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
      query["location.locationId"] = new mongoose.Types.ObjectId(locationId);
    }

    const list = await StsBaseAuditReport.find(query)
      .sort({ date: -1, uploadedAt: -1 })
      .lean();

    // Get available years from serialNumber (e.g. 2028-001 -> 2028)
    const allReports = await StsBaseAuditReport.find({ serialNumber: { $exists: true, $ne: null, $ne: "" } })
      .select("serialNumber")
      .lean();

    const yearsSet = new Set();
    allReports.forEach((report) => {
      if (report.serialNumber && /^\d{4}-/.test(report.serialNumber)) {
        const reportYear = Number(report.serialNumber.split("-")[0]);
        if (!Number.isNaN(reportYear)) yearsSet.add(reportYear);
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return NextResponse.json({ 
      success: true, 
      data: list,
      years: years.length > 0 ? years : [new Date().getFullYear()],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
