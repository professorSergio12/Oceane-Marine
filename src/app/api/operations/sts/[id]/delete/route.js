import { NextResponse } from "next/server";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import { connectDB } from "@/lib/config/connection";
import { notifyOperationsDelete } from "@/lib/notifications/operationsNotified";
import { releaseOperationEquipment, requireOpsPermission } from "@/lib/operations/stsOperationGuards";

export async function DELETE(req, { params }) {
  try {
    const { response } = await requireOpsPermission("canDeleteForm");
    if (response) return response;

    await connectDB();
    const { id } = await params;
    const userOperation = await StsOperation.findById(id);
    if (!userOperation) {
      return NextResponse.json(
        { success: false, error: "Operation not found" },
        { status: 404 }
      );
    }

    if (!userOperation.isLatest) {
      return NextResponse.json(
        { success: false, error: "Only latest version can be deleted" },
        { status: 403 }
      );
    }

    if (!userOperation.parentOperationId) {
      return NextResponse.json(
        { success: false, error: "Operation has no version group; refusing to delete" },
        { status: 400 }
      );
    }

    // Free any equipment still locked by this operation before it disappears
    await releaseOperationEquipment(userOperation.toObject().equipments);

    await StsOperation.deleteMany({
      parentOperationId: userOperation.parentOperationId,
    });

    void notifyOperationsDelete("STS Operations", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err?.name === "CastError") {
      return NextResponse.json({ success: false, error: "Operation not found" }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
