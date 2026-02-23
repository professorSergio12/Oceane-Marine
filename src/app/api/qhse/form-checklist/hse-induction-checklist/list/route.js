import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import HseInductionChecklist from "@/lib/mongodb/models/qhse-form-checklist/HseInductionChecklist";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    // Build query
    const query = {};
    
    // Filter by year if provided (using dateOfInduction)
    if (year) {
      const yearNum = Number.parseInt(year, 10);
      const startDate = new Date(`${yearNum}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${yearNum + 1}-01-01T00:00:00.000Z`);
      query.dateOfInduction = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const forms = await HseInductionChecklist.find(query)
      .sort({ dateOfInduction: -1, createdAt: -1 })
      .lean();

    // Get available years from all forms
    const allForms = await HseInductionChecklist.find({ dateOfInduction: { $exists: true, $ne: null } })
      .select("dateOfInduction")
      .lean();

    const yearsSet = new Set();
    allForms.forEach((form) => {
      if (form.dateOfInduction) {
        const formYear = new Date(form.dateOfInduction).getFullYear();
        yearsSet.add(formYear);
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return NextResponse.json(
      { 
        success: true, 
        data: forms,
        years: years.length > 0 ? years : [new Date().getFullYear()],
      },
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("HSE Induction Checklist List Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
