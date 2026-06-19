import mongoose from "mongoose";

/**
 * One record per file migrated from SharePoint.
 * The file itself lives in DigitalOcean Spaces — here we store only the
 * pointer (spacesKey/url) plus metadata for searching and de-duplication.
 */
const sharepointFileSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, index: true }, // e.g. "HR"
    subModule: { type: String, default: "", index: true }, // e.g. "oil-majors"

    // Date components (from the SharePoint year folder, else the modified date)
    year: { type: Number, index: true },
    month: { type: String, default: "" }, // "01".."12"
    day: { type: String, default: "" }, // "01".."31"

    // Where the file actually lives (local disk or DigitalOcean Spaces)
    storageKey: { type: String, required: true, unique: true }, // HR/Oil-Majors/Shell/file.pdf
    storageUrl: { type: String, default: "" }, // /uploads/sharepoint/... or https://...spaces...
    storageDriver: { type: String, default: "local" }, // "local" | "spaces"

    // File details
    originalName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },

    // SharePoint origin (for traceability and idempotent re-runs)
    sharePointId: { type: String, required: true, unique: true, index: true },
    sourceFolder: { type: String, default: "" }, // original SP folder, e.g. "Fender Hire"
    sharePointModified: { type: Date },
    sharePointWebUrl: { type: String, default: "" },

    migratedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

sharepointFileSchema.index({ module: 1, subModule: 1, year: 1, month: 1 });

export default mongoose.models.SharepointFile ||
  mongoose.model("SharepointFile", sharepointFileSchema);