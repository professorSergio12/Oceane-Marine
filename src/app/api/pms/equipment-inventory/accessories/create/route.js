import { NextResponse } from "next/server";
import Accessories from "@/lib/mongodb/models/pms/Accessories.js";
import { connectDB } from "@/lib/config/connection.js";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      category,
      status,
      equipmentNo,
      equipmentName,
      specification,
      purchaseDate,
      remarks,
      quantity,
      putInUse,
      putInUseDate,
      placedIn
    } = body;

    // -----------------------------
    // Basic Validation
    // -----------------------------
    if (!category || !equipmentName || !placedIn) {
      return NextResponse.json(
        { message: "Required fields missing" },
        { status: 400 }
      );
    }

    // -----------------------------
    // Category Specific Validation
    // -----------------------------
    if (category === "REGULAR") {
      if (!equipmentNo) {
        return NextResponse.json(
          { message: "Equipment number is required for REGULAR accessories" },
          { status: 400 }
        );
      }
    }

    if (category === "OCCASIONAL") {
      if (!quantity || quantity <= 0) {
        return NextResponse.json(
          { message: "Quantity is required for OCCASIONAL accessories" },
          { status: 400 }
        );
      }
    }

    // -----------------------------
    // Enum Safety
    // -----------------------------
    const validCategories = ["REGULAR", "OCCASIONAL"];
    const validStatuses = ["ACTIVE", "INACTIVE"];
    const validLocations = ["OFFICE", "BAY", "BASE"];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { message: "Invalid category value" },
        { status: 400 }
      );
    }

    if (category === "OCCASIONAL" && status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 }
      );
    }

    if (!validLocations.includes(placedIn)) {
      return NextResponse.json(
        { message: "Invalid placedIn value" },
        { status: 400 }
      );
    }

    // -----------------------------
    // Business Rule Validation
    // -----------------------------
    if (putInUse && !putInUseDate) {
      return NextResponse.json(
        { message: "Put in use date is required" },
        { status: 400 }
      );
    }

    // -----------------------------
    // Duplicate Check (REGULAR only)
    // -----------------------------
    if (category === "REGULAR") {
      const exists = await Accessories.findOne({ equipmentNo });
      if (exists) {
        return NextResponse.json(
          { message: "Accessory with this equipment number already exists" },
          { status: 409 }
        );
      }
    }

    // -----------------------------
    // Create Record
    // -----------------------------
    const accessoryData = {
      category,
      status: category === "OCCASIONAL" ? status : "ACTIVE",
      equipmentName: equipmentName.trim(),
      placedIn,
      putInUse: putInUse || false
    };

    // Add optional fields only if they have values
    if (specification && typeof specification === "string" && specification.trim()) {
      accessoryData.specification = specification.trim();
    }

    if (purchaseDate) {
      try {
        accessoryData.purchaseDate = new Date(purchaseDate);
        // Validate date
        if (isNaN(accessoryData.purchaseDate.getTime())) {
          delete accessoryData.purchaseDate;
        }
      } catch (e) {
        // Invalid date, skip it
      }
    }

    if (remarks && typeof remarks === "string" && remarks.trim()) {
      accessoryData.remarks = remarks.trim();
    }

    if (putInUse && putInUseDate) {
      try {
        accessoryData.putInUseDate = new Date(putInUseDate);
        // Validate date
        if (isNaN(accessoryData.putInUseDate.getTime())) {
          return NextResponse.json(
            { message: "Invalid put in use date" },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { message: "Invalid put in use date format" },
          { status: 400 }
        );
      }
    }

    // Add category-specific fields
    if (category === "REGULAR") {
      accessoryData.equipmentNo = String(equipmentNo).trim();
    }

    if (category === "OCCASIONAL") {
      accessoryData.quantity = Number(quantity);
    }

    const accessory = await Accessories.create(accessoryData);

    return NextResponse.json(
      {
        message: "Accessory created successfully",
        data: accessory
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Accessories Error:", error);
    console.error("Error Stack:", error.stack);
    console.error("Error Name:", error.name);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { message: messages.join(", ") || "Validation error" },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Accessory with this equipment number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
