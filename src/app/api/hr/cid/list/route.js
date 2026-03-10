import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Cid from "@/lib/mongodb/models/hr/Cid";

export async function GET() {
  await connectDB();

  try {
    const records = await Cid.find({ status: "ACTIVE" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: records }, { status: 200 });
  } catch (err) {
    console.error("CID list error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to fetch records", error: err.message },
      { status: 500 }
    );
  }
}
