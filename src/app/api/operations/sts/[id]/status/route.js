import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import MooringMaster from "@/lib/mongodb/models/MooringMaster";
import { releaseOperationEquipment, requireOpsPermission } from "@/lib/operations/stsOperationGuards";

export async function PATCH(req, { params }) {
  const { response } = await requireOpsPermission("canEditForm");
  if (response) return response;

  await connectDB();
  const { id } = await params;

  try {
    const operation = await StsOperation.findById(id);
    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      );
    }

    if (!operation.isLatest) {
      return NextResponse.json(
        { error: "Only latest version can be completed" },
        { status: 403 }
      );
    }

    if (operation.operationStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Operation already completed" },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Release equipment first so a failure can't leave a completed operation holding it
    operation.equipments = await releaseOperationEquipment(operation.toObject().equipments, now);

    // 2. Complete the operation
    operation.operationStatus = "COMPLETED";
    operation.operationEndTime = now;
    await operation.save();

    // 3. Release mooring master
    if (operation.mooringMaster) {
      await MooringMaster.findByIdAndUpdate(operation.mooringMaster, {
        availability: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Operation completed successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
