import { NextResponse } from "next/server";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import { connectDB } from "@/lib/config/connection";
import path from "path";
import fs from "fs/promises";
import { assertPmsPermission } from "@/lib/auth/pmsGuard";

const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, "_");

export async function POST(req) {
  const guard = await assertPmsPermission("canCreate");
  if (!guard.ok) return guard.response;
  try {
    await connectDB();

    const formData = await req.formData();

    const equipmentCode = formData.get("equipmentCode");
    const equipmentName = formData.get("equipmentName");
    const equipmentType = formData.get("equipmentType") || "";
    const specification = formData.get("specification") || "";
    const manufacturer = formData.get("manufacturer") || "";
    const yearOfManufacturing = formData.get("yearOfManufacturing");
    const ownershipType = formData.get("ownershipType");
    const dateOfPurchase = formData.get("dateOfPurchase");
    const firstUseDate = formData.get("firstUseDate");
    const lastTestDate = formData.get("lastTestDate");
    const nextTestDate = formData.get("nextTestDate");
    const retirementPeriodYears = formData.get("retirementPeriodYears");
    const remarks = formData.get("remarks") || "";

    if (!equipmentCode || !equipmentName || !ownershipType) {
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
        dateToBeRetired.getFullYear() + Number(retirementPeriodYears)
      );
    }

    // Handle Manufacturing Certificate file
    let manufacturingCertificate = { fileUrl: "", originalFileName: "" };
    const manufacturingCertFile = formData.get("manufacturingCertificate");
    if (manufacturingCertFile && typeof manufacturingCertFile !== "string" && manufacturingCertFile.name && manufacturingCertFile.size > 0) {
      const sanitizedCode = sanitize(equipmentCode.trim());
      const baseDir = path.join(process.cwd(), "public/uploads/pms/equipment", sanitizedCode, "manufacturing-certificate");
      await fs.mkdir(baseDir, { recursive: true });

      const buffer = Buffer.from(await manufacturingCertFile.arrayBuffer());
      const fileName = `${Date.now()}-${sanitize(manufacturingCertFile.name)}`;
      const filePath = path.join(baseDir, fileName);
      await fs.writeFile(filePath, buffer);

      manufacturingCertificate = {
        fileUrl: `/uploads/pms/equipment/${sanitizedCode}/manufacturing-certificate/${fileName}`,
        originalFileName: manufacturingCertFile.name,
      };
    }

    // Handle Test Certificate file
    let testCertificate = { fileUrl: "", originalFileName: "" };
    const testCertFile = formData.get("testCertificate");
    if (testCertFile && typeof testCertFile !== "string" && testCertFile.name && testCertFile.size > 0) {
      const sanitizedCode = sanitize(equipmentCode.trim());
      const baseDir = path.join(process.cwd(), "public/uploads/pms/equipment", sanitizedCode, "test-certificate");
      await fs.mkdir(baseDir, { recursive: true });

      const buffer = Buffer.from(await testCertFile.arrayBuffer());
      const fileName = `${Date.now()}-${sanitize(testCertFile.name)}`;
      const filePath = path.join(baseDir, fileName);
      await fs.writeFile(filePath, buffer);

      testCertificate = {
        fileUrl: `/uploads/pms/equipment/${sanitizedCode}/test-certificate/${fileName}`,
        originalFileName: testCertFile.name,
      };
    }

    const equipment = await Equipment.create({
      equipmentCode,
      equipmentName,
      equipmentType,
      specification,
      manufacturer,
      yearOfManufacturing: yearOfManufacturing ? Number(yearOfManufacturing) : undefined,
      ownershipType,

      status: "ACTIVE",
      isInUse: false,

      dateOfPurchase: dateOfPurchase ? new Date(dateOfPurchase) : undefined,
      firstUseDate: firstUseDate ? new Date(firstUseDate) : undefined,
      lastTestDate: lastTestDate ? new Date(lastTestDate) : undefined,
      nextTestDate: nextTestDate ? new Date(nextTestDate) : undefined,

      retirementPeriodYears: retirementPeriodYears ? Number(retirementPeriodYears) : 10,
      dateToBeRetired,

      manufacturingCertificate,
      testCertificate,
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
