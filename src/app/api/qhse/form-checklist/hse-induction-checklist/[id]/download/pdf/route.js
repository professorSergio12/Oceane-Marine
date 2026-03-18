import { NextResponse } from "next/server";

/**
 * PDF download for HSE Induction Checklist - placeholder for future implementation.
 * When PDF generation is implemented, replace this with actual PDF generation logic.
 */
export async function GET() {
  return NextResponse.json(
    { error: "PDF download will be available soon.", code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
