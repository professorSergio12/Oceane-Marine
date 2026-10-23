import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import Location from "@/lib/mongodb/models/Location";
import CargoType from "@/lib/mongodb/models/CargoType";
import MooringMaster from "@/lib/mongodb/models/MooringMaster";
import { getHistoricalBaseline, operationBarrels } from "@/lib/operations/dashboardBaseline";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // Build date filter
    const dateFilter = {};
    if (year) {
      const yearNum = parseInt(year);
      if (month) {
        const monthNum = parseInt(month);
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 1);
        dateFilter.operationStartTime = {
          $gte: startDate,
          $lt: endDate,
        };
      } else {
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum + 1, 0, 1);
        dateFilter.operationStartTime = {
          $gte: startDate,
          $lt: endDate,
        };
      }
    }

    // Get all operations with filters
    const operations = await StsOperation.find({
      isLatest: true,
      ...dateFilter,
    })
      .populate("location", "name")
      .populate("typeOfCargo", "type")
      .populate("mooringMaster", "name")
      .lean();

    // 1. Overall STS operations count
    let totalOperations = operations.length;

    // 2. Status count ("Lined Up" is the app's pending status)
    const statusCount = {
      COMPLETED: 0,
      CANCELED: 0,
      INPROGRESS: 0,
      PENDING: 0,
    };
    operations.forEach((op) => {
      const raw = op.operationStatus || "PENDING";
      const status = raw === "Lined Up" ? "PENDING" : raw;
      if (Object.prototype.hasOwnProperty.call(statusCount, status)) {
        statusCount[status]++;
      }
    });

    // 3. Location-wise operations
    const locationWise = {};
    operations.forEach((op) => {
      const locName = op.location?.name || "Unknown";
      locationWise[locName] = (locationWise[locName] || 0) + 1;
    });

    // 4. Total barrels transferred: completed operations only, quantity is stored in MT → barrels
    let totalBarrels = operations
      .filter((op) => op.operationStatus === "COMPLETED")
      .reduce((sum, op) => sum + operationBarrels(op), 0);

    // All-time view: start from the client's figures (671 completed ops, 700M barrels) and add
    // every operation recorded in the app. Each app operation is counted once (latest version).
    let baseline = { applied: false };
    if (!year) {
      const historical = getHistoricalBaseline();
      const appCompleted = operations.filter((op) => op.operationStatus === "COMPLETED");
      const appBarrels = appCompleted.reduce((sum, op) => sum + operationBarrels(op), 0);

      totalOperations = historical.completedOperations + operations.length;
      statusCount.COMPLETED = historical.completedOperations + appCompleted.length;
      totalBarrels = historical.barrels + appBarrels;

      baseline = {
        applied: true,
        completedOperations: historical.completedOperations,
        barrels: historical.barrels,
        newOperations: operations.length,
        newCompletedOperations: appCompleted.length,
        newBarrels: Math.round(appBarrels * 100) / 100,
      };
    }
    totalBarrels = Math.round(totalBarrels * 100) / 100;

    // 5. Most used Mooring Master
    const mooringMasterCount = {};
    operations.forEach((op) => {
      if (op.mooringMaster) {
        const mmName = op.mooringMaster?.name || "Unknown";
        mooringMasterCount[mmName] = (mooringMasterCount[mmName] || 0) + 1;
      }
    });
    const mostUsedMooringMaster = Object.entries(mooringMasterCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // 6. Cargo types transferred
    const cargoTypes = {};
    operations.forEach((op) => {
      if (op.typeOfCargo) {
        const cargoName = op.typeOfCargo?.type || "Unknown";
        cargoTypes[cargoName] = (cargoTypes[cargoName] || 0) + 1;
      }
    });

    // 7. LOA range - Note: LOA data not available in current schema
    // Will return empty object if not available
    const loaRanges = {
      "50-100": 0,
      "100-150": 0,
      "150-200": 0,
      "200-250": 0,
      "250-300": 0,
      "300-330": 0,
      "330+": 0,
    };
    // TODO: Add LOA field to StsOperation schema if needed

    // 8. Clients-wise operations
    const clientsCount = {};
    operations.forEach((op) => {
      if (op.client) {
        const clientName = op.client.trim() || "Unknown";
        clientsCount[clientName] = (clientsCount[clientName] || 0) + 1;
      }
    });
    const clientsData = Object.entries(clientsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      success: true,
      data: {
        totalOperations,
        statusCount,
        locationWise,
        totalBarrels,
        mostUsedMooringMaster,
        cargoTypes,
        loaRanges,
        clientsData,
        baseline,
      },
    });
  } catch (error) {
    console.error("Operations Dashboard Stats Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch operations statistics" },
      { status: 500 }
    );
  }
}

