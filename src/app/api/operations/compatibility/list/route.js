import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Compatibility from "@/lib/mongodb/models/operations/Compatibility";
import { findCompatibilityGroup, groupCompatibilityList } from "@/lib/operations/compatibilityGroup";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const locationId = searchParams.get("locationId");
    const operationNumber = searchParams.get("operationNumber");

    // One operation's saved calculation (hose + fender combined) — used to prefill the form
    if (operationNumber) {
      const group = await findCompatibilityGroup(operationNumber);
      return NextResponse.json({ success: true, data: groupCompatibilityList(group) });
    }

    let query = {};
    if (year) {
      const y = Number(year);
      if (Number.isFinite(y)) query.year = y;
    }
    if (locationId) {
      query["location.locationId"] = locationId;
    }

    const records = await Compatibility.find(query)
      .sort({ year: -1, operationNumber: 1, createdAt: -1 })
      .lean();
    // One entry per operation: hose + fender combined (older separate records included)
    const data = groupCompatibilityList(records);

    // Sort here, not in the query: the database compares raw text, so an operation number saved
    // with a leading space sorts first, and "2026-1000" would sort before "2026-481".
    // Latest first: newest year, then highest operation number
    const opNumber = (rec) => String(rec.operationNumber ?? "").trim();
    data.sort(
      (a, b) =>
        (Number(b.year) || 0) - (Number(a.year) || 0) ||
        opNumber(b).localeCompare(opNumber(a), undefined, { numeric: true, sensitivity: "base" })
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
