import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import OilMajor from "@/lib/mongodb/models/hr/OilMajor";
import path from "path";
import fs from "fs/promises";

export async function PUT(req, { params }) {
  await connectDB();

  try {
    const { id } = await params;
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

    // Find existing record
    const existing = await OilMajor.findById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Record not found" },
        { status: 404 }
      );
    }

    // Determine attachment
    let attachmentData = existing.attachment || { fileUrl: "", originalFileName: "" };

    if (
      attachment &&
      typeof attachment !== "string" &&
      attachment.name &&
      attachment.size > 0
    ) {
      // Delete old file if exists
      if (attachmentData.fileUrl) {
        try {
          const oldFilePath = path.join(process.cwd(), "public", attachmentData.fileUrl);
          await fs.unlink(oldFilePath);
          // Try to clean up empty directory
          const dir = path.dirname(oldFilePath);
          const files = await fs.readdir(dir);
          if (files.length === 0) await fs.rmdir(dir);
        } catch {
          // Ignore file deletion errors
        }
      }

      // Save new file
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

    // Update
    existing.companyName = companyName.trim();
    existing.status = status;
    existing.attachment = attachmentData;
    await existing.save();

    return NextResponse.json({ data: existing }, { status: 200 });
  } catch (err) {
    console.error("Oil Major update error:", err);
    return NextResponse.json(
      { message: err.message || "Update failed", error: err.message },
      { status: 500 }
    );
  }
}
