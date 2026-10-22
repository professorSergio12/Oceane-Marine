import { NextResponse } from "next/server";
import { requireOpsAdmin } from "@/lib/auth/requireOpsAdmin";
import { connectDB } from "@/lib/config/connection";
import Location from "@/lib/mongodb/models/Location";

/** Returns { value } (number or null to clear), { skip } when absent, or { invalid } */
function parseCoordinate(body, field, min, max) {
  if (!(field in body)) return { skip: true };
  const raw = body[field];
  if (raw === null || raw === "") return { value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return { invalid: true };
  return { value: n };
}

export async function PUT(req, { params }) {
  try {
    const { response } = await requireOpsAdmin();
    if (response) return response;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updateData = {};

    if (typeof body.name === "string" && body.name.trim() !== "") {
      updateData.name = body.name.trim();
    }

    const lat = parseCoordinate(body, "latitude", -90, 90);
    const lng = parseCoordinate(body, "longitude", -180, 180);
    if (lat.invalid || lng.invalid) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90 and longitude between -180 and 180" },
        { status: 400 }
      );
    }
    if (!lat.skip) updateData.latitude = lat.value;
    if (!lng.skip) updateData.longitude = lng.value;

    const updated = await Location.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, strict: false }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Location updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "Location already exists" }, { status: 400 });
    }
    if (error?.name === "CastError") {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
