import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import OilMajor from "@/lib/mongodb/models/hr/OilMajor";

export async function GET() {
  await connectDB();

  try {
    const records = await OilMajor.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: records }, { status: 200 });
  } catch (err) {
    console.error("Oil Major list error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to fetch records", error: err.message },
      { status: 500 }
    );
  }
}
