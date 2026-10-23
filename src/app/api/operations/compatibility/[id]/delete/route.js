import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Compatibility from "@/lib/mongodb/models/operations/Compatibility";
import { notifyOperationsEdit, notifyOperationsDelete } from "@/lib/notifications/operationsNotified";
import { requireOpsPermission } from "@/lib/operations/stsOperationGuards";
import { findCompatibilityGroup } from "@/lib/operations/compatibilityGroup";

export async function DELETE(req, { params }) {
  const { response: authResponse } = await requireOpsPermission("canDeleteCompatibility");
  if (authResponse) return authResponse;

  await connectDB();

  try {
    const { id } = await params;

    // Find the record
    const record = await Compatibility.findById(id);
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    // The list shows one combined record per operation, so delete every record of that
    // operation (older separate hose / fender records included)
    const group = await findCompatibilityGroup(record.operationNumber);
    const ids = group.length > 0 ? group.map((r) => r._id) : [record._id];
    await Compatibility.deleteMany({ _id: { $in: ids } });

    void notifyOperationsDelete("Compatibility", id);
    return NextResponse.json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete record" },
      { status: 500 }
    );
  }
}
