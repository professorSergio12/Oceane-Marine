import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import EquipmentDefect from "@/lib/mongodb/models/qhse-defect/EquipmentDefect";
import { notifyEdit } from "@/lib/notifications/moduleNotify";

const VALID_STATUSES = ["Open", "In Progress", "Closed"];

export async function PUT(req, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const equipmentDefect = await EquipmentDefect.findById(id);
    if (!equipmentDefect) {
      return NextResponse.json(
        { error: "Equipment defect not found" },
        { status: 404 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // No body: legacy "close" behaviour
      if (equipmentDefect.status === "Closed") {
        return NextResponse.json(
          { error: "Equipment defect already closed" },
          { status: 400 }
        );
      }
      equipmentDefect.status = "Closed";
      equipmentDefect.completionDate = new Date();
      await equipmentDefect.save();
      return NextResponse.json(
        { message: "Equipment defect closed successfully", data: equipmentDefect },
        { status: 200 }
      );
    }

    // Full edit: equipmentDefect, base, actionRequired, targetDate
    const { status, equipmentDefect: equipmentDefectText, base, actionRequired, targetDate } = body;
    if (equipmentDefectText != null) equipmentDefect.equipmentDefect = equipmentDefectText;
    if (base != null) equipmentDefect.base = base;
    if (actionRequired != null) equipmentDefect.actionRequired = actionRequired;
    if (targetDate != null) equipmentDefect.targetDate = new Date(targetDate);

    if (status && VALID_STATUSES.includes(status)) {
      equipmentDefect.status = status;
      if (status === "Closed") {
        equipmentDefect.completionDate = equipmentDefect.completionDate || new Date();
      } else {
        equipmentDefect.completionDate = null;
        equipmentDefect.closedBy = null;
      }
    }

    await equipmentDefect.save();
    void notifyEdit("QHSE", "defects-list · update", id);
    return NextResponse.json(
      { message: "Defect updated successfully", data: equipmentDefect },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
