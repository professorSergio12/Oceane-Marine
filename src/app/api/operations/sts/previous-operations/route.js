import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import { getRegisterRows } from "@/lib/operations/stsRegisterExport";

/**
 * GET /api/operations/sts/previous-operations
 * Completed operations whose equipment can be reused on a new operation:
 *  - app operations (equipment saved on the operation), and
 *  - historical register jobs (EquipUSED codes matched to PMS equipment code / serial).
 * When the same ref exists in both, the app operation wins. Read-only.
 */

/**
 * Equipment code as a match key. The register writes the same item in different ways
 * ("20516 - 5", "TC/AM/20516-5", "20516-5"), so spaces and the TC/AM/ certificate prefix are ignored.
 */
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^tc\/am\//, "");

function splitCodes(text) {
  return String(text || "")
    .split(/[,;\n]+/)
    .map((c) => c.trim())
    .filter((c) => c && !/^(n\/?a|nil|none|-)$/i.test(c));
}

export async function GET() {
  try {
    await connectDB();

    const [appOps, registerRows, allEquipment] = await Promise.all([
      StsOperation.find({ isLatest: true, operationStatus: "COMPLETED" })
        .select("Operation_Ref_No chs ms operationStartTime operationEndTime equipments")
        .populate("equipments.equipment", "equipmentCode equipmentName serialCode")
        .sort({ operationStartTime: -1 })
        .lean(),
      getRegisterRows(),
      Equipment.find().select("equipmentCode equipmentName serialCode").lean(),
    ]);

    const results = [];
    const appRefs = new Set();

    for (const op of appOps) {
      const ref = String(op.Operation_Ref_No || "").trim();
      if (ref) appRefs.add(ref);
      const seen = new Set();
      const equipment = (op.equipments || [])
        .map((e) => e?.equipment)
        .filter((e) => e?._id && !seen.has(String(e._id)) && seen.add(String(e._id)))
        .map((e) => ({ _id: String(e._id), code: e.equipmentCode || "", name: e.equipmentName || "" }));
      if (equipment.length === 0) continue;
      results.push({
        key: `app:${op._id}`,
        ref,
        source: "app",
        date: op.operationEndTime || op.operationStartTime || null,
        vessels: [op.chs, op.ms].filter(Boolean).join(" / "),
        equipment,
        unmatchedCodes: [],
      });
    }

    // PMS lookup by equipment code and serial (case-insensitive)
    const byCode = new Map();
    for (const eq of allEquipment) {
      for (const k of [eq.equipmentCode, eq.serialCode]) {
        const key = norm(k);
        if (!key) continue;
        if (!byCode.has(key)) byCode.set(key, []);
        byCode.get(key).push(eq);
      }
    }

    registerRows.forEach((row, index) => {
      if (row.status.toLowerCase() !== "completed" || !row.equipmentUsed) return;
      if (row.ref && appRefs.has(row.ref)) return; // app version already listed
      const seen = new Set();
      const equipment = [];
      const unmatchedCodes = [];
      for (const code of splitCodes(row.equipmentUsed)) {
        const matches = byCode.get(norm(code));
        if (!matches) {
          unmatchedCodes.push(code);
          continue;
        }
        for (const eq of matches) {
          if (seen.has(String(eq._id))) continue;
          seen.add(String(eq._id));
          equipment.push({ _id: String(eq._id), code: eq.equipmentCode || "", name: eq.equipmentName || "" });
        }
      }
      if (equipment.length === 0) return; // nothing in PMS to add
      results.push({
        key: `register:${index}`,
        ref: row.ref,
        source: "register",
        date: row.date,
        vessels: [row.stbl, row.ss].filter(Boolean).join(" / "),
        equipment,
        unmatchedCodes,
      });
    });

    results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Previous operations error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load previous operations" },
      { status: 500 }
    );
  }
}
