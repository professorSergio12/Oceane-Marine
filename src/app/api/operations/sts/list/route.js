import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
// Import models to ensure they're registered before populate
import "@/lib/mongodb/models/Location";
import "@/lib/mongodb/models/MooringMaster";

export async function GET(req) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const year = searchParams.get("year");

    // Build query
    const query = { isLatest: true };

    // Add status filter
    if (status) {
      query.operationStatus = status;
    }

    // Add year filter
    if (year) {
      const yearNum = parseInt(year);
      const startDate = new Date(yearNum, 0, 1);
      const endDate = new Date(yearNum + 1, 0, 1);
      query.operationStartTime = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const list = await StsOperation.find(query)
      .populate("location", "name")
      .populate("mooringMaster", "name")
      .populate("typeOfCargo", "type")
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
