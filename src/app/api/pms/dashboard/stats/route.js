import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import WarehouseManagement from "@/lib/mongodb/models/pms/WarehouseManagement";
import EquipmentTest from "@/lib/mongodb/models/pms/EquipmentTest";
import Accessories from "@/lib/mongodb/models/pms/Accessories";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import Certificate from "@/lib/mongodb/models/pms/Certificate";
import { assertPmsPermission } from "@/lib/auth/pmsGuard";
import "@/lib/mongodb/models/Location";

/**
 * Hose / primary fender / secondary fender from a Primary Equipment item.
 * Name and type are free text (e.g. name "Hose", type "Clean"), so match on keywords.
 */
function classifyEquipment(eq) {
  const text = `${eq.equipmentName || ""} ${eq.equipmentType || ""}`.toLowerCase();
  if (/\bhoses?\b/.test(text)) return "hoses";
  if (/\bfenders?\b/.test(text)) return /\bsecondary\b|\bs\.?\s?fender/.test(text) ? "secondaryFenders" : "primaryFenders";
  return null;
}

export async function GET(req) {
  const guard = await assertPmsPermission("canView");
  if (!guard.ok) return guard.response;
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* ========== WAREHOUSE DATA ========== */
    const warehouseFilter = { isDeleted: false };
    if (location) warehouseFilter.location = location.trim();

    const warehouseData = await WarehouseManagement.find(warehouseFilter)
      .sort({ startDate: -1 })
      .lean();

    const warehouseHoses = warehouseData.reduce((s, i) => s + (i.hoses || 0), 0);
    const warehousePrimaryFenders = warehouseData.reduce((s, i) => s + (i.primaryFenders || 0), 0);
    const warehouseSecondaryFenders = warehouseData.reduce((s, i) => s + (i.secondaryFenders || 0), 0);

    /* ========== EQUIPMENT DATA ========== */
    const allEquipment = await Equipment.find({ status: { $ne: "RETIRED" } }).lean();

    // Primary Equipment items are counted too (name/type are free text, so classify by keyword)
    const inventoryCounts = { hoses: 0, primaryFenders: 0, secondaryFenders: 0 };
    const inventoryByLocation = {};
    allEquipment.forEach((eq) => {
      const kind = classifyEquipment(eq);
      if (!kind) return;
      inventoryCounts[kind] += 1;
      const loc = String(eq.locationName || "").trim();
      if (!loc) return;
      inventoryByLocation[loc] = inventoryByLocation[loc] || { hoses: 0, primaryFenders: 0, secondaryFenders: 0 };
      inventoryByLocation[loc][kind] += 1;
    });

    // Group by equipmentType for donut chart
    const equipmentByType = {};
    allEquipment.forEach((eq) => {
      const type = eq.equipmentType || "Other";
      equipmentByType[type] = (equipmentByType[type] || 0) + 1;
    });

    // Total counts
    const totalEquipment = allEquipment.length;
    const activeEquipment = allEquipment.filter((e) => e.status === "ACTIVE").length;
    const inUseEquipment = allEquipment.filter((e) => e.isInUse).length;

    /* ========== UPCOMING TEST / OVERDUE ========== */
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingTestDue = allEquipment.filter(
      (eq) =>
        eq.nextTestDate &&
        new Date(eq.nextTestDate) >= today &&
        new Date(eq.nextTestDate) <= thirtyDaysFromNow
    ).length;

    const overdueEquipment = allEquipment.filter(
      (eq) => eq.nextTestDate && new Date(eq.nextTestDate) < today
    ).length;

    const overdueTests = await EquipmentTest.countDocuments({ status: "OVERDUE" });
    const totalOverdue = overdueEquipment + overdueTests;

    /* ========== RETIREMENT ========== */
    const retiredEquipment = await Equipment.find({ status: "RETIRED" })
      .select("equipmentType")
      .lean();
    const retirementByType = {};
    retiredEquipment.forEach((eq) => {
      const type = eq.equipmentType || "Unknown";
      retirementByType[type] = (retirementByType[type] || 0) + 1;
    });

    /* ========== EQUIPMENT BY LOCATION (warehouse records + Primary Equipment, keyed by PMS Location name) ========== */
    const equipmentByLocation = {};
    const addToLocation = (loc, counts) => {
      const key = String(loc || "").trim();
      if (!key) return;
      const cur = equipmentByLocation[key] || { primaryFenders: 0, secondaryFenders: 0, hoses: 0 };
      cur.primaryFenders += counts.primaryFenders || 0;
      cur.secondaryFenders += counts.secondaryFenders || 0;
      cur.hoses += counts.hoses || 0;
      equipmentByLocation[key] = cur;
    };
    warehouseData.forEach((item) => addToLocation(item.location, item));
    Object.entries(inventoryByLocation).forEach(([loc, counts]) => addToLocation(loc, counts));
    Object.keys(equipmentByLocation).forEach((loc) => {
      const c = equipmentByLocation[loc];
      if (c.primaryFenders + c.secondaryFenders + c.hoses === 0) delete equipmentByLocation[loc];
    });

    /* ========== CERTIFICATIONS ========== */
    const totalCertificates = await Certificate.countDocuments();
    const equipmentWithTestCertificate = allEquipment.filter((eq) => eq.testCertificate?.fileUrl).length;

    /* ========== SPARE USAGE (ACCESSORIES - OCCASIONAL) ========== */
    const spares = await Accessories.find({
      isDeleted: { $ne: true },
      category: "OCCASIONAL",
    })
      .select("equipmentName quantity status")
      .lean();

    /* ========== EQUIPMENT CURRENTLY IN USE (from STS Operations) ========== */
    const inUseOps = await StsOperation.find({
      isLatest: true,
      "equipments.status": "IN_USE",
    })
      .populate("equipments.equipment", "equipmentCode equipmentName equipmentType")
      .populate("location", "name")
      .select(
        "Operation_Ref_No operationStartTime equipments location operationStatus"
      )
      .sort({ operationStartTime: -1 })
      .limit(20)
      .lean();

    // Flatten into rows
    const equipmentInUse = [];
    inUseOps.forEach((op) => {
      // Skip usage entries whose equipment no longer exists in PMS (deleted records)
      const inUseItems = (op.equipments || []).filter(
        (e) => e.status === "IN_USE" && e.equipment?._id
      );
      inUseItems.forEach((item) => {
        equipmentInUse.push({
          date: op.operationStartTime,
          operationRef: op.Operation_Ref_No,
          equipmentName: item.equipment?.equipmentName || "—",
          equipmentCode: item.equipment?.equipmentCode || "—",
          equipmentType: item.equipment?.equipmentType || "—",
          location: op.location?.name || "—",
          startTime: item.startTime,
        });
      });
    });

    /* ========== CURRENT WAREHOUSE MOVEMENTS ========== */
    const activeMovements = await WarehouseManagement.find({
      isDeleted: false,
      status: "NOT_COMPLETED",
      fromLocation: { $exists: true, $ne: "" },
      toLocation: { $exists: true, $ne: "" },
    })
      .sort({ startDate: -1 })
      .limit(10)
      .lean();

    const warehouseMovements = activeMovements.map((m) => ({
      _id: m._id,
      equipment: m.equipment,
      equipmentType: m.equipmentType,
      nos: m.nos,
      fromLocation: m.fromLocation,
      stopover: m.stopover,
      toLocation: m.toLocation,
      startDate: m.startDate,
      estimatedEndDate: m.estimatedEndDate,
    }));

    /* ========== EQUIPMENT TESTS STATS ========== */
    const plannedTests = await EquipmentTest.countDocuments({ status: "PLANNED" });
    const completedTests = await EquipmentTest.countDocuments({ status: "COMPLETED" });

    return NextResponse.json({
      success: true,
      data: {
        // Summary cards
        totalEquipment,
        activeEquipment,
        inUseEquipment,
        upcomingTestDue,
        overdue: totalOverdue,
        plannedTests,
        completedTests,
        totalCertificates,
        equipmentWithTestCertificate,

        // Fenders & Hoses: Primary Equipment items + Warehouse Management quantities
        hoses: {
          total: inventoryCounts.hoses + warehouseHoses,
          inventory: inventoryCounts.hoses,
          warehouse: warehouseHoses,
        },
        fenders: {
          primary: inventoryCounts.primaryFenders + warehousePrimaryFenders,
          secondary: inventoryCounts.secondaryFenders + warehouseSecondaryFenders,
          total:
            inventoryCounts.primaryFenders + warehousePrimaryFenders +
            inventoryCounts.secondaryFenders + warehouseSecondaryFenders,
          inventory: inventoryCounts.primaryFenders + inventoryCounts.secondaryFenders,
          warehouse: warehousePrimaryFenders + warehouseSecondaryFenders,
        },

        // Chart data
        equipmentByType,
        retirement: retirementByType,
        equipmentByLocation,

        // Tables
        spares,
        equipmentInUse,
        warehouseMovements,
      },
    });
  } catch (error) {
    console.error("PMS Dashboard Stats Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch PMS statistics",
      },
      { status: 500 }
    );
  }
}
