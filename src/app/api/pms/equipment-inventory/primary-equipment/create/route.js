import { NextResponse } from "next/server";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import { connectDB } from "@/lib/config/connection";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      equipmentCode,
      equipmentName,
      equipmentType,
      specification,
      manufacturer,
      yearOfManufacturing,
      ownershipType,
      dateOfPurchase,
      firstUseDate,
      lastTestDate,
      nextTestDate,
      retirementPeriodYears,
      remarks
    } = body;

    if (!equipmentCode || !equipmentName || !equipmentType || !ownershipType) {
      return NextResponse.json(
        { message: "Required fields missing" },
        { status: 400 }
      );
    }

    const exists = await Equipment.findOne({ equipmentCode });

    if (exists) {
      return NextResponse.json(
        { message: "Equipment with this code already exists" },
        { status: 409 }
      );
    }

    let dateToBeRetired = null;

    if (firstUseDate && retirementPeriodYears) {
      dateToBeRetired = new Date(firstUseDate);
      dateToBeRetired.setFullYear(
        dateToBeRetired.getFullYear() + retirementPeriodYears
      );
    }

    const equipment = await Equipment.create({
      equipmentCode,
      equipmentName,
      equipmentType,
      specification,
      manufacturer,
      yearOfManufacturing,
      ownershipType,

      status: "ACTIVE",
      isInUse: false,

      dateOfPurchase,
      firstUseDate,
      lastTestDate,
      nextTestDate,

      retirementPeriodYears,
      dateToBeRetired,

      remarks
    });

    return NextResponse.json(
      {
        message: "Equipment created successfully",
        data: equipment
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Equipment Error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
