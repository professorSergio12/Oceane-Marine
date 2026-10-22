import { NextResponse } from "next/server";
import { getSessionUserWithOpsPerms } from "@/lib/auth/getSessionUser";
import Equipment from "@/lib/mongodb/models/pms/Equipment";

/** Statuses after which an operation no longer holds its equipment. */
export const FINISHED_OPERATION_STATUSES = new Set(["COMPLETED", "CANCELED"]);

/**
 * Ensure the session user has an operations permission (e.g. "canEditForm").
 * Returns { user } on success, otherwise { response } to return as-is.
 */
export async function requireOpsPermission(permission) {
  const { user, permissions } = await getSessionUserWithOpsPerms();
  if (!user) {
    return { response: NextResponse.json({ error: "Not logged in" }, { status: 401 }) };
  }
  if (!permissions?.[permission]) {
    return {
      response: NextResponse.json(
        { error: "You don't have permission to do this. Operations editor role is required." },
        { status: 403 }
      ),
    };
  }
  return { user };
}

/**
 * Release every IN_USE equipment of an operation: unlock it in PMS and mark the
 * usage entry RELEASED. Returns the updated equipments array (plain objects) to
 * store on the operation; the caller saves it.
 */
export async function releaseOperationEquipment(equipments, releasedAt = new Date()) {
  const list = Array.isArray(equipments) ? equipments : [];
  const toRelease = list.filter((eq) => eq?.status === "IN_USE" && eq.equipment);

  if (toRelease.length > 0) {
    await Equipment.updateMany(
      { _id: { $in: toRelease.map((eq) => eq.equipment) } },
      { $set: { isInUse: false } }
    );
  }

  return list.map((eq) => {
    if (eq?.status !== "IN_USE") return eq;
    const start = eq.startTime ? new Date(eq.startTime).getTime() : NaN;
    return {
      ...eq,
      status: "RELEASED",
      endTime: releasedAt,
      usedHours: Number.isFinite(start) ? Math.max(0, (releasedAt.getTime() - start) / 36e5) : eq.usedHours,
    };
  });
}
