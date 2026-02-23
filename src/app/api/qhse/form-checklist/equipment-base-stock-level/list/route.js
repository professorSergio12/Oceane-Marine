import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsEquipmentBaseStockLevel from "@/lib/mongodb/models/qhse-form-checklist/StsEquipmentBaseStockLevel";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    // Build query
    const query = {};
    
    // Filter by year if provided: match serialNumber (e.g. 2026-001) OR year field
    if (year) {
      const yearNum = Number.parseInt(year, 10);
      if (!Number.isNaN(yearNum)) {
        query.$or = [
          { serialNumber: new RegExp(`^${yearNum}-`) },
          { year: yearNum },
        ];
      }
    }

    const records = await StsEquipmentBaseStockLevel.find(query)
      .sort({ revisionDate: -1, createdAt: -1 })
      .lean();

    // Get available years from serialNumber and year field
    const allRecords = await StsEquipmentBaseStockLevel.find({})
      .select("serialNumber year")
      .lean();

    const yearsSet = new Set();
    allRecords.forEach((record) => {
      if (record.year != null && !Number.isNaN(Number(record.year))) {
        yearsSet.add(Number(record.year));
      }
      if (record.serialNumber && /^\d{4}-/.test(record.serialNumber)) {
        const recordYear = Number(record.serialNumber.split("-")[0]);
        if (!Number.isNaN(recordYear)) yearsSet.add(recordYear);
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return NextResponse.json({ 
      success: true, 
      data: records,
      years: years.length > 0 ? years : [new Date().getFullYear()],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
