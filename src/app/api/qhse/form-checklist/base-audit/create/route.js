import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";
import Location from "@/lib/mongodb/models/Location";
import { getNextYearwiseSerial } from "@/lib/mongodb/models/YearwiseSerialCounter";
import { saveQhseFile } from "@/lib/utils/qhse-file-storage";

export const runtime = "nodejs";

export async function POST(req) {
  await connectDB();

  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const yearRaw = formData.get("year");
    const description = formData.get("description");
    const uploadedByName = formData.get("uploadedBy");
    const locationId = formData.get("locationId");

    const year =
      yearRaw != null && yearRaw !== ""
        ? Number(yearRaw)
        : new Date().getFullYear();

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const version = "1.0";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let locationData = null;
    if (locationId) {
      const locationDoc = await Location.findById(locationId).lean();
      if (locationDoc) {
        locationData = { locationId: locationDoc._id, name: locationDoc.name };
      }
    }

    const recordDate = new Date(year, 0, 1);
    const filePath = await saveQhseFile({
      formCode: "QAF-OFD-004",
      location: locationData?.name || null,
      date: recordDate,
      title: description || "Base-Audit",
      fileType: "documents",
      fileName: file.name,
      buffer,
    });

    const serialNumber = await getNextYearwiseSerial("STS_BASE_AUDIT", year);

    const record = await StsBaseAuditReport.create({
      serialNumber,
      description,
      filePath,
      version,
      date: new Date(),
      ...(locationData && { location: locationData }),
      uploadedBy: { name: uploadedByName },
    });

    return NextResponse.json({
      message: "File uploaded successfully",
      version,
      data: record,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
