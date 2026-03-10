import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Cid from "@/lib/mongodb/models/hr/Cid";

export async function DELETE(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;

    const record = await Cid.findById(id);
    if (!record) {
      return NextResponse.json({ message: "CID record not found" }, { status: 404 });
    }

    await Cid.findByIdAndDelete(id);

    return NextResponse.json({ message: "CID record deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("CID deletion error:", err);
    return NextResponse.json(
      { message: err.message || "Deletion failed", error: err.message },
      { status: 500 }
    );
  }
}
