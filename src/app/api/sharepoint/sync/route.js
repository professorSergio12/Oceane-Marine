import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { createAndScheduleJob } from "../../../../jobs/agenda/jobHelper.js";
import SharepointSyncStatus from "@/lib/mongodb/models/SharepointSyncStatus";
import { getModuleConfig } from "@/lib/services/sharepoint/moduleConfig";
import "../../../../jobs/definitions/sharepoint-sync.job.js";

/**
 * POST /api/sharepoint/sync   body: { moduleKey: "hr" | "operations" | "pms" | "qhse" }
 * Queues a background sync job and returns immediately. The worker runs it.
 */
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const { moduleKey } = await req.json();

    const config = getModuleConfig(moduleKey);
    if (!config) {
      return NextResponse.json(
        { error: `Unknown module "${moduleKey}"` },
        { status: 400 }
      );
    }

    // Don't queue a second run while one is already in progress.
    const current = await SharepointSyncStatus.findOne({ moduleKey }).lean();
    if (current && (current.status === "running" || current.status === "queued")) {
      return NextResponse.json(
        { message: "Sync already in progress", status: current },
        { status: 409 }
      );
    }

    await SharepointSyncStatus.findOneAndUpdate(
      { moduleKey },
      {
        status: "queued",
        error: "",
        startedAt: new Date(),
        finishedAt: null,
        startedBy: user.name || user.email || String(user._id || ""),
      },
      { upsert: true }
    );

    await createAndScheduleJob(null, "sharepoint-sync", {
      moduleKey,
      startedBy: user.name || user.email || "",
    });

    return NextResponse.json(
      { success: true, message: `Sync queued for ${config.label}` },
      { status: 202 }
    );
  } catch (err) {
    console.error("SharePoint sync queue error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to queue sync" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sharepoint/sync?moduleKey=hr   -> current status for the button to poll.
 */
export async function GET(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const moduleKey = new URL(req.url).searchParams.get("moduleKey");
  if (!moduleKey) {
    return NextResponse.json({ error: "moduleKey is required" }, { status: 400 });
  }

  const status = await SharepointSyncStatus.findOne({ moduleKey }).lean();
  return NextResponse.json(
    { status: status || { moduleKey, status: "idle" } },
    { status: 200 }
  );
}