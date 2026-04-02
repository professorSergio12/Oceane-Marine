import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import TrainingPlan from "@/lib/mongodb/models/qhse-training/TrainingPlan";
import TrainingRecord from "@/lib/mongodb/models/qhse-training/TrainingRecord";
import { notifyEdit, notifyDelete } from "@/lib/notifications/moduleNotify";

export async function GET(req, { params } ) {
  try {
    await connectDB();

    const { id } = await params;
    const plan = await TrainingPlan.findById(id);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Training plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error("Get Training Plan Error:", error);
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
    const plan = await TrainingPlan.findById(id);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Training plan not found" },
        { status: 404 }
      );
    }
    // Delete all training records linked to this plan
    const deleteRecordsResult = await TrainingRecord.deleteMany({
      trainingPlanId: id,
    });
    await TrainingPlan.findByIdAndDelete(id);
    void notifyDelete("QHSE", "training · plan", id);
    return NextResponse.json(
      {
        success: true,
        message: "Training plan deleted",
        recordsDeleted: deleteRecordsResult.deletedCount ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Training Plan Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
