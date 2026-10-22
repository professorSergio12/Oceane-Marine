import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Location from "@/lib/mongodb/models/Location";

export async function GET() {
  await connectDB();
  try {
    const locations = await Location.find()
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ locations });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
