import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import SupplierDueDiligence from "@/lib/mongodb/models/qhse-due-diligence/SupplierDueDiligence";

export async function GET() {
  await connectDB();
  try {
    const supplierDueDiligences = await SupplierDueDiligence.find();
    return NextResponse.json(
      { supplierDueDiligences }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500}
    );
  }
}
