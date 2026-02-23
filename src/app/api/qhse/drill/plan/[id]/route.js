import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import DrillPlan from "@/lib/mongodb/models/qhse-drill/DrillPlan";
import DrillReport from "@/lib/mongodb/models/qhse-drill/DrillReport";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const plan = await DrillPlan.findById(id);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Drill plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("Get Drill Plan Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const plan = await DrillPlan.findById(id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Drill plan not found" },
        { status: 404 }
      );
    }
    const planYear = plan.year;

    // Delete all quarter reports for this plan's year
    const deleteReportsResult = await DrillReport.deleteMany({ year: planYear });

    await DrillPlan.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Drill plan deleted",
        reportsDeleted: deleteReportsResult.deletedCount ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Drill Plan Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Approve all plan items in a drill plan
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const year = body?.year ? Number.parseInt(body.year, 10) : null;

    let existingPlan = id ? await DrillPlan.findById(id) : null;

    // Fallback: if not found by id but year was provided, get latest plan for that year
    if (!existingPlan && year) {
      existingPlan = await DrillPlan.findOne({ year }).sort({ createdAt: -1 });
    }

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: "Drill plan not found" },
        { status: 404 }
      );
    }

    const allApproved = existingPlan.planItems.every(
      (item) => item.status === "Approved"
    );

    if (allApproved) {
      return NextResponse.json(
        { success: false, error: "All plan items are already approved" },
        { status: 403 }
      );
    }

    existingPlan.planItems = existingPlan.planItems.map((item) => ({
      ...item,
      status: "Approved",
    }));
    existingPlan.approvedAt = new Date();

    const approvedPlan = await existingPlan.save();

    return NextResponse.json({ success: true, data: approvedPlan }, { status: 200 });
  } catch (error) {
    console.error("Approve Drill Plan Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

