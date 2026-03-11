import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import OilMajor from "@/lib/mongodb/models/hr/OilMajor";
import path from "path";
import fs from "fs/promises";

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();

    const companyName = formData.get("companyName");
    const status = formData.get("status");
    const attachment = formData.get("attachment");

    // Validate required fields
    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { message: "Company Name is required" },
        { status: 400 }
      );
    }
    if (
      !status ||
      !["Approved", "Counterparty STS service provider", "In Progress"].includes(status)
    ) {
      return NextResponse.json(
        { message: "Valid status is required" },
        { status: 400 }
      );
    }

    let attachmentData = { fileUrl: "", originalFileName: "" };

    // Handle file upload if provided
    if (
      attachment &&
      typeof attachment !== "string" &&
      attachment.name &&
      attachment.size > 0
    ) {
      const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, "_");
      const sanitizedCompany = sanitize(companyName.trim());

      const baseDir = path.join(
        process.cwd(),
        "public/uploads/hr/oil-majors",
        sanitizedCompany
      );
      await fs.mkdir(baseDir, { recursive: true });

      const buffer = Buffer.from(await attachment.arrayBuffer());
      const fileName = `${Date.now()}-${sanitize(attachment.name)}`;
      const filePath = path.join(baseDir, fileName);
      await fs.writeFile(filePath, buffer);

      attachmentData = {
        fileUrl: `/uploads/hr/oil-majors/${sanitizedCompany}/${fileName}`,
        originalFileName: attachment.name,
      };
    }

    const record = await OilMajor.create({
      companyName: companyName.trim(),
      status,
      attachment: attachmentData,
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    console.error("Oil Major creation error:", err);
    return NextResponse.json(
      { message: err.message || "Creation failed", error: err.message },
      { status: 500 }
    );
  }
}
