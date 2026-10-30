import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
// Import models to ensure they're registered before populate
import "@/lib/mongodb/models/Location";
import "@/lib/mongodb/models/MooringMaster";

/** "2026-541" → [2026, 541]; null for refs in any other format */
function refSortKey(ref) {
  const m = String(ref || "").trim().match(/^(\d{4})\s*-\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** Job number order, newest first (2026-545, 2026-543, …); other refs follow, newest created first */
function compareByRefDesc(a, b) {
  const ka = refSortKey(a.Operation_Ref_No);
  const kb = refSortKey(b.Operation_Ref_No);
  if (ka && kb) return kb[0] - ka[0] || kb[1] - ka[1];
  if (ka) return -1;
  if (kb) return 1;
  return 0; // keep the createdAt order from the query
}

export async function GET(req) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const quarter = searchParams.get("quarter");

    // Build query
    const query = { isLatest: true };

    // Add status filter (one status, or several comma-separated: "INPROGRESS,Lined Up")
    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      query.operationStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    const yearNum = year ? parseInt(year, 10) : NaN;
    const monthNum = month ? parseInt(month, 10) : NaN;
    const quarterNum = quarter ? parseInt(quarter, 10) : NaN;

    const hasYear = !Number.isNaN(yearNum);
    const hasMonth = !Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12;
    const hasQuarter =
      !Number.isNaN(quarterNum) && quarterNum >= 1 && quarterNum <= 4;

    // operationStartTime: year (+ optional month or quarter), or month/quarter across all years
    if (hasYear) {
      let startDate;
      let endDate;
      if (hasMonth) {
        startDate = new Date(yearNum, monthNum - 1, 1);
        endDate = new Date(yearNum, monthNum, 1);
      } else if (hasQuarter) {
        const startMonth = (quarterNum - 1) * 3;
        startDate = new Date(yearNum, startMonth, 1);
        endDate = new Date(yearNum, startMonth + 3, 1);
      } else {
        startDate = new Date(yearNum, 0, 1);
        endDate = new Date(yearNum + 1, 0, 1);
      }
      query.operationStartTime = {
        $gte: startDate,
        $lt: endDate,
      };
    } else if (hasMonth) {
      query.$expr = {
        $eq: [{ $month: "$operationStartTime" }, monthNum],
      };
    } else if (hasQuarter) {
      const startMonth = (quarterNum - 1) * 3;
      query.$expr = {
        $in: [
          { $month: "$operationStartTime" },
          [startMonth + 1, startMonth + 2, startMonth + 3],
        ],
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

    list.sort(compareByRefDesc);

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
