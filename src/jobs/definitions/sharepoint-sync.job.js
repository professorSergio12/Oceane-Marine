import { runModuleSync } from "../../lib/services/sharepoint/migrateModule.js";
import SharepointSyncStatus from "../../lib/mongodb/models/SharepointSyncStatus.js";

/**
 * Background job: sync one module's SharePoint files into DigitalOcean Spaces.
 * Triggered by the per-module "Sync" button (queued via the API route).
 *
 * Heavy + long-running (thousands of files) — which is exactly why it runs in
 * the worker, not inside the HTTP request.
 */
export function defineSharepointSyncJob(agenda) {
  agenda.define(
    "sharepoint-sync",
    { concurrency: 1, lockLifetime: 60 * 60 * 1000 }, // 1 hour lock for long runs
    async (job) => {
      const { moduleKey, startedBy } = job.attrs.data || {};
      if (!moduleKey) throw new Error("Missing moduleKey in job data");

      const siteUrl = process.env.SHAREPOINT_SITE_URL;
      if (!siteUrl) throw new Error("SHAREPOINT_SITE_URL is not set");

      console.log(`🔄 SharePoint sync started for module: ${moduleKey}`);

      // Keep the job lock fresh. This sync runs for many minutes; the worker's
      // health check re-queues any lock older than 5 minutes (treating it as a
      // crashed job), which would otherwise restart this job in an infinite
      // loop. Touching every 60s keeps the lock young so that never triggers.
      const keepAlive = setInterval(() => {
        job.touch().catch(() => {});
      }, 60 * 1000);

      // Mark running (reset counters for this run).
      await SharepointSyncStatus.findOneAndUpdate(
        { moduleKey },
        {
          status: "running",
          uploaded: 0,
          skipped: 0,
          failed: 0,
          total: 0,
          currentFolder: "",
          error: "",
          startedAt: new Date(),
          finishedAt: null,
          startedBy: startedBy || "",
        },
        { upsert: true }
      );

      try {
        const stats = await runModuleSync({
          moduleKey,
          siteUrl,
          onProgress: async (p) => {
            await SharepointSyncStatus.updateOne(
              { moduleKey },
              {
                uploaded: p.uploaded,
                skipped: p.skipped,
                failed: p.failed,
                total: p.total,
                currentFolder: p.currentFolder || "",
              }
            );
          },
        });

        await SharepointSyncStatus.updateOne(
          { moduleKey },
          {
            status: "done",
            uploaded: stats.uploaded,
            skipped: stats.skipped,
            failed: stats.failed,
            total: stats.total,
            currentFolder: "",
            finishedAt: new Date(),
          }
        );
        console.log(`✅ SharePoint sync done for ${moduleKey}`, stats);
      } catch (err) {
        console.error(`❌ SharePoint sync failed for ${moduleKey}:`, err.message);
        await SharepointSyncStatus.updateOne(
          { moduleKey },
          {
            status: "error",
            error: err.message || "Sync failed",
            finishedAt: new Date(),
          }
        );
        throw err;
      } finally {
        clearInterval(keepAlive);
      }
    }
  );
}