import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import TargetKpi from "@/lib/mongodb/models/qhse-kpi/TargetKpi";

export async function POST(req) {
  await connectDB();

  try {
    const body = await req.json();
    const { year, rows } = body;

    const yearNum = year != null ? Number(year) : new Date().getFullYear();
    if (Number.isNaN(yearNum)) {
      return NextResponse.json(
        { success: false, error: "Valid year is required" },
        { status: 400 }
      );
    }

    const normalizedRows = Array.isArray(rows)
      ? rows.map((r) => ({
          title: r.title || "",
          targetForYear: Number(r.targetForYear) || 0,
          quarter1: Number(r.quarter1) || 0,
          quarter2: Number(r.quarter2) || 0,
          quarter3: Number(r.quarter3) || 0,
          quarter4: Number(r.quarter4) || 0,
          targetsAchieved: Number(r.targetsAchieved) || 0,
        }))
      : [];

    const record = await TargetKpi.create({
      year: yearNum,
      rows: normalizedRows,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Target KPI saved successfully",
        data: record,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Target KPI create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Target KPI",
      },
      { status: 500 }
    );
  }
}
