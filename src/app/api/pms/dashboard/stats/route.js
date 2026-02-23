import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import WarehouseManagement from "@/lib/mongodb/models/pms/WarehouseManagement";
import EquipmentTest from "@/lib/mongodb/models/pms/EquipmentTest";

export async function GET(req) {
  try {
    await connectDB();
    console.log("PMS Dashboard Stats API called");

    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build filter for WarehouseManagement
    const warehouseFilter = {
      isDeleted: false,
      status: "ACTIVE",
    };
    if (location) {
      warehouseFilter.location = location.toUpperCase();
    }

    // Get warehouse data for fenders and hoses
    const warehouseData = await WarehouseManagement.find(warehouseFilter).lean();

    // Calculate totals
    const totalHoses = warehouseData.reduce((sum, item) => sum + (item.hoses || 0), 0);
    const totalPrimaryFenders = warehouseData.reduce((sum, item) => sum + (item.primaryFenders || 0), 0);
    const totalSecondaryFenders = warehouseData.reduce((sum, item) => sum + (item.secondaryFenders || 0), 0);

    // Get equipment data
    const equipmentFilter = { status: "ACTIVE" };
    const allEquipment = await Equipment.find(equipmentFilter).lean();

    // Upcoming Test Due - equipment with nextTestDate in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingTestDue = allEquipment.filter(
      (eq) => eq.nextTestDate && new Date(eq.nextTestDate) >= today && new Date(eq.nextTestDate) <= thirtyDaysFromNow
    ).length;

    // Overdue - equipment with nextTestDate < today or EquipmentTest with OVERDUE status
    const overdueEquipment = allEquipment.filter(
      (eq) => eq.nextTestDate && new Date(eq.nextTestDate) < today
    ).length;

    const overdueTests = await EquipmentTest.countDocuments({
      status: "OVERDUE",
    });

    const totalOverdue = overdueEquipment + overdueTests;

    // Retirement of equipment - count by equipmentType where status is RETIRED
    const retiredEquipment = await Equipment.find({ status: "RETIRED" })
      .select("equipmentType")
      .lean();

    const retirementByType = {};
    retiredEquipment.forEach((eq) => {
      const type = eq.equipmentType || "Unknown";
      retirementByType[type] = (retirementByType[type] || 0) + 1;
    });

    // Equipment by location - aggregate from WarehouseManagement
    const equipmentByLocation = {};
    const locations = ["DUBAI", "SOHAR", "FUJAIRAH", "YEOSU", "MOMBASA", "TANJUNG_BRUAS"];

    locations.forEach((loc) => {
      const locData = warehouseData.filter((item) => item.location === loc);
      equipmentByLocation[loc] = {
        primaryFenders: locData.reduce((sum, item) => sum + (item.primaryFenders || 0), 0),
        secondaryFenders: locData.reduce((sum, item) => sum + (item.secondaryFenders || 0), 0),
        hoses: locData.reduce((sum, item) => sum + (item.hoses || 0), 0),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        hoses: {
          total: totalHoses,
        },
        fenders: {
          primary: totalPrimaryFenders,
          secondary: totalSecondaryFenders,
          total: totalPrimaryFenders + totalSecondaryFenders,
        },
        upcomingTestDue,
        overdue: totalOverdue,
        retirement: retirementByType,
        equipmentByLocation,
      },
    });
  } catch (error) {
    console.error("PMS Dashboard Stats Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch PMS statistics" },
      { status: 500 }
    );
  }
}

