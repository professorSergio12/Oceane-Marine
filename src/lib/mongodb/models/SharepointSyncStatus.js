import mongoose from "mongoose";

const SYNC_STATES = ["idle", "queued", "running", "done", "error"];

/**
 * One record per module ("hr", "operations", "pms", "qhse") tracking the live
 * status of its SharePoint -> Spaces sync. The sync button reads this to show
 * progress; the background job writes to it.
 */
const sharepointSyncStatusSchema = new mongoose.Schema(
  {
    moduleKey: { type: String, required: true, unique: true, index: true },

    status: { type: String, enum: SYNC_STATES, default: "idle" },

    // Live counters (updated as the job runs)
    uploaded: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    currentFolder: { type: String, default: "" },
    error: { type: String, default: "" },

    startedAt: { type: Date },
    finishedAt: { type: Date },
    startedBy: { type: String, default: "" }, // user id/name who clicked sync
  },
  { timestamps: true }
);

export default mongoose.models.SharepointSyncStatus ||
  mongoose.model("SharepointSyncStatus", sharepointSyncStatusSchema);