import { NextResponse } from "next/server";
import { requireOpsAdmin } from "@/lib/auth/requireOpsAdmin";
import { connectDB } from "@/lib/config/connection";
import Location from "@/lib/mongodb/models/Location";

function parseCoordinate(value, min, max) {
  if (value == null || value === "") return { value: undefined };
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return { invalid: true };
  return { value: n };
}

export async function POST(req) {
  try {
    const { response } = await requireOpsAdmin();
    if (response) return response;

    await connectDB();
    const { name: rawName, latitude, longitude } = await req.json();
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const lat = parseCoordinate(latitude, -90, 90);
    const lng = parseCoordinate(longitude, -180, 180);
    if (lat.invalid || lng.invalid) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90 and longitude between -180 and 180" },
        { status: 400 }
      );
    }

    const existingLocation = await Location.findOne({ name });
    if (existingLocation) {
      return NextResponse.json(
        { error: "Location already exists" },
        { status: 400 }
      );
    }

    const locationData = { name };
    if (lat.value !== undefined) locationData.latitude = lat.value;
    if (lng.value !== undefined) locationData.longitude = lng.value;

    const newLocation = new Location(locationData);
    await newLocation.save();
    return NextResponse.json(
      { message: "Location created successfully", data: newLocation },
      { status: 201 }
    );
  } catch (error) {
    // Unique index on name: two requests raced past the findOne check
    if (error?.code === 11000) {
      return NextResponse.json({ error: "Location already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
