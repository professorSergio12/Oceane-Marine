import { NextResponse } from "next/server";

/**
 * PDF download for Vendor/Supplier Approval - placeholder for future implementation.
 */
export async function GET() {
  return NextResponse.json(
    { error: "PDF download will be available soon.", code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
