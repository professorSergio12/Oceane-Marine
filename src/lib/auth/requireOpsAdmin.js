import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";

/**
 * Guard for operations master-data routes (locations, office checks).
 * Returns { user } when the session user is an operations admin,
 * otherwise { response } with a 401/403 JSON response to return as-is.
 */
export async function requireOpsAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Not logged in" }, { status: 401 }),
    };
  }
  if (user.operationsRole !== "admin") {
    return {
      response: NextResponse.json(
        { error: "Forbidden: Admin role required" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
