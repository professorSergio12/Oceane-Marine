import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import ManualFormCode from "@/lib/mongodb/models/operations-form-checklist/ManualFormCode";

export async function DELETE(req, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const record = await ManualFormCode.findByIdAndDelete(id);
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Form code not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "Form code deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
