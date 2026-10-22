import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { requireOpsAdmin } from "@/lib/auth/requireOpsAdmin";
import { connectDB } from "@/lib/config/connection";
import Location from "@/lib/mongodb/models/Location";
import LocationOfficeCheck from "@/lib/mongodb/models/operations/operations-locations/LocationOfficeCheck";
import { OFFICE_CHECK_KEYS_EXPORT } from "@/lib/mongodb/models/operations/operations-locations/LocationOfficeCheck";

export const runtime = "nodejs";

const ALLOWED_EXT = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png",
]);
const MAX_SIZE = 25 * 1024 * 1024; // 25MB
const UPLOAD_BASE = "uploads/location";

function getField(formData, name) {
  const val = formData.get(name);
  return typeof val === "string" ? val.trim() : "";
}

/** Safe single path segment for folder / file names (no slashes, no "..") */
function safeSegment(value, fallback) {
  const cleaned = String(value || "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "");
  return cleaned || fallback;
}

function badRequest(error) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

/** Returns an error message if the file is not acceptable, otherwise "" */
function validateFile(file, label) {
  if (file.size > MAX_SIZE) return `File for ${label} exceeds 25MB`;
  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return `Invalid file type for ${label}. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`;
  }
  return "";
}

export async function POST(req) {
  const writtenFiles = [];

  try {
    const { user, response } = await requireOpsAdmin();
    if (response) return response;

    await connectDB();

    const formData = await req.formData();
    const locationId = getField(formData, "locationId");
    const yearParam = getField(formData, "year");

    if (!locationId || !mongoose.isValidObjectId(locationId)) {
      return badRequest("Location is required");
    }
    const location = await Location.findById(locationId).lean();
    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location not found. Please refresh the page." },
        { status: 404 }
      );
    }
    const locationName = location.name;

    const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();
    if (Number.isNaN(year)) {
      return badRequest("Valid year is required");
    }

    const officeChecks = {};
    for (const key of OFFICE_CHECK_KEYS_EXPORT) {
      const val = formData.get(key);
      officeChecks[key] = val === "true" || val === "on" || val === "1";
    }

    // 1) Collect and validate every file before writing anything to disk
    const newCheckboxFiles = [];
    for (const key of OFFICE_CHECK_KEYS_EXPORT) {
      const file = formData.get(`attachment_${key}`);
      if (file && typeof file !== "string" && file.size > 0) {
        if (!officeChecks[key]) continue; // file for an unticked check is ignored
        const error = validateFile(file, key);
        if (error) return badRequest(error);
        newCheckboxFiles.push({ key, file });
      }
    }

    const newAdditionalFiles = [];
    let idx = 0;
    while (true) {
      const file = formData.get(`additional_${idx}`);
      if (!file || typeof file === "string") break;
      if (file.size > 0) {
        const error = validateFile(file, "additional attachment");
        if (error) return badRequest(error);
        newAdditionalFiles.push({ idx, file });
      }
      idx += 1;
    }

    // 2) Write files (tracked so they can be removed if anything fails)
    const folder = safeSegment(locationName, "location");
    const uploadDir = path.join(process.cwd(), UPLOAD_BASE, folder, String(year));
    fs.mkdirSync(uploadDir, { recursive: true });

    const saveFile = async (file, prefix) => {
      const uniqueName = `${prefix}-${safeSegment(file.name, "file")}`;
      const fullPath = path.join(uploadDir, uniqueName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(fullPath, buffer);
      writtenFiles.push(fullPath);
      return {
        filePath: `${UPLOAD_BASE}/${folder}/${year}/${uniqueName}`,
        fileName: file.name || uniqueName,
        uploadedAt: new Date(),
      };
    };

    const now = Date.now();
    const savedCheckbox = {};
    for (const { key, file } of newCheckboxFiles) {
      savedCheckbox[key] = { key, ...(await saveFile(file, `${now}-${key}`)) };
    }
    const savedAdditional = [];
    for (const { idx: i, file } of newAdditionalFiles) {
      savedAdditional.push(await saveFile(file, `${now}-${i}`));
    }

    // 3) Merge with the existing record so earlier ticks / files are not lost
    const existing = await LocationOfficeCheck.findOne({ locationId, year }).lean();

    const checkboxAttachments = [];
    for (const key of OFFICE_CHECK_KEYS_EXPORT) {
      if (!officeChecks[key]) continue; // unticked check: drop its attachment from the record
      if (savedCheckbox[key]) {
        checkboxAttachments.push(savedCheckbox[key]);
      } else {
        const previous = (existing?.checkboxAttachments || []).find((a) => a.key === key);
        if (previous) checkboxAttachments.push(previous);
      }
    }

    const additionalAttachments = [
      ...(existing?.additionalAttachments || []),
      ...savedAdditional,
    ];

    const payload = {
      locationId,
      locationName,
      year,
      officeChecks,
      checkboxAttachments,
      additionalAttachments,
      lastUploaded: new Date(),
      uploadedBy: {
        userId: user._id,
        name: user.employeeName || user.email || undefined,
      },
    };

    const record = await LocationOfficeCheck.findOneAndUpdate(
      { locationId, year },
      { $set: payload },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Location office check saved successfully",
      data: record,
    });
  } catch (error) {
    console.error("Location create error:", error);
    for (const file of writtenFiles) {
      try {
        fs.unlinkSync(file);
      } catch {
        // already gone
      }
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
