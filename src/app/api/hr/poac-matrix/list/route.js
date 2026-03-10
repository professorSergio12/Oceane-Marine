import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import PoacMatrix from "@/lib/mongodb/models/hr/PoacMatrix";

export async function GET(req) {
  await connectDB();

  try {
    const poacMatrices = await PoacMatrix.find({ status: "ACTIVE" }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: poacMatrices,
    });
  } catch (err) {
    console.error("POAC Matrix list error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch POAC Matrix", error: err.message },
      { status: 500 }
    );
  }
}
