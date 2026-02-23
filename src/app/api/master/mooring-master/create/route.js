import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import MooringMaster from "@/lib/mongodb/models/MooringMaster";

export async function POST(req) {
  await connectDB();

  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Case-insensitive duplicate check
    const existingMooringMaster = await MooringMaster.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });

    if (existingMooringMaster) {
      return NextResponse.json(
        { error: "Mooring master already exists" },
        { status: 400 }
      );
    }

    const newMooringMaster = await MooringMaster.create({
      name: name.trim(),
      availabilityStatus: "AVAILABLE",
      currentOperation: null,
    });

    return NextResponse.json(
      {
        message: "Mooring master created successfully",
        data: newMooringMaster,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
