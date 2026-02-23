import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Location from "@/lib/mongodb/models/Location";

export async function POST(req) {
  await connectDB();

  try {
    const { name } = await req.json();
    const existingLocation = await Location.findOne({ name });
    if (existingLocation) {
      return NextResponse.json(
        { error: "Location already exists" },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const newLocation = new Location({ name });
    await newLocation.save();
    return NextResponse.json(
      { message: "Location created successfully", data: newLocation },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
