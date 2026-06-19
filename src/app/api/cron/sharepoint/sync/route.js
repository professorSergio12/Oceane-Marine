import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import { createAndScheduleJob } from "../../../../../jobs/agenda/jobHelper.js";
import SharepointSyncStatus from "@/lib/mongodb/models/SharepointSyncStatus";
import { getModuleConfig } from "@/lib/services/sharepoint/moduleConfig";
import "../../../../../jobs/definitions/sharepoint-sync.job.js";

/**
 * Scheduled SharePoint sync (called by the standalone cron-jobs runner once a
 * day per module, at staggered times).
 *
 *   GET /api/cron/sharepoint/sync?moduleKey=hr
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Only QUEUES the background job (the worker runs the heavy sync). Re-walks the
 * whole SharePoint tree, so NEW files/folders added inside a module's configured
 * folders are picked up automatically (existing ones are skipped).
 *
 * Designed to never throw outward: if anything fails (e.g. SharePoint access was
 * revoked), it returns a clean JSON error and the worker marks the run "error"
 * — nothing crashes, and the next day's run retries on its own.
 */
export async function GET(request) {
  // --- Auth (same pattern as the other /api/cron/* routes) ---
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
    }
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const moduleKey = new URL(request.url).searchParams.get("moduleKey");
  if (!moduleKey || !getModuleConfig(moduleKey)) {
    return NextResponse.json(
      { error: `Unknown or missing moduleKey "${moduleKey}"` },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Don't queue a second run while one is already active (avoids overlap).
    const current = await SharepointSyncStatus.findOne({ moduleKey }).lean();
    if (current && (current.status === "running" || current.status === "queued")) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: `Sync already ${current.status} for ${moduleKey}`,
      });
    }

    await SharepointSyncStatus.findOneAndUpdate(
      { moduleKey },
      {
        status: "queued",
        error: "",
        startedAt: new Date(),
        finishedAt: null,
        startedBy: "cron",
      },
      { upsert: true }
    );

    await createAndScheduleJob(null, "sharepoint-sync", { moduleKey, startedBy: "cron" });

    return NextResponse.json({ ok: true, queued: true, moduleKey });
  } catch (e) {
    // Never propagate — log + clean response so the scheduler stays healthy.
    console.error(`[cron sharepoint-sync] queue failed for ${moduleKey}:`, e.message);
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to queue sync" },
      { status: 500 }
    );
  }
}
