import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { connectDB } from "@/lib/config/connection";
import Compatibility from "@/lib/mongodb/models/operations/Compatibility";
import { computeHose, computeFender } from "@/app/operations/sts-operations/new/compatibility/calculations";
import {
  FENDER_SHIP_FIELDS,
  HOSE_SHIP_FIELDS,
  findCompatibilityGroup,
  mergeCompatibilityRecords,
} from "@/lib/operations/compatibilityGroup";

export async function POST(req) {
  await connectDB();
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.operationsRole !== "editor") {
      return NextResponse.json({ error: "Forbidden: Editor role required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      operationRef,
      operationNumber,
      year,
      locationId,
      locationName,
      STBL,
      SS,
      section,
    } = body;

    if (!operationNumber || !year) {
      return NextResponse.json(
        { error: "Operation number and year are required" },
        { status: 400 }
      );
    }

    const stbl = STBL || {};
    const ss = SS || {};
    const isFender = section === "fender";
    const sectionFields = isFender ? FENDER_SHIP_FIELDS : HOSE_SHIP_FIELDS;

    // Hose and fender for the same operation share ONE record: if one exists, add this
    // section to it (its other section's values stay untouched) instead of creating another.
    const group = await findCompatibilityGroup(operationNumber);
    if (group.length > 0) {
      const target = mergeCompatibilityRecords(group);
      const mergeShip = (existing, incoming) => {
        const out = { ...existing };
        for (const f of sectionFields) if (incoming[f] != null) out[f] = incoming[f];
        if (incoming.name) out.name = incoming.name;
        return out;
      };
      const mergedSTBL = mergeShip(target.STBL, stbl);
      const mergedSS = mergeShip(target.SS, ss);
      const results = { ...(target.results || {}) };
      if (isFender) results.fender = computeFender(mergedSTBL, mergedSS);
      else results.hose = computeHose(mergedSTBL, mergedSS);

      const updated = await Compatibility.findByIdAndUpdate(
        target._id,
        {
          $set: {
            operationRef: operationRef || target.operationRef || null,
            // Same operation — keep the number exactly as first saved
            operationNumber: target.operationNumber,
            year: Number(year),
            location: {
              locationId: locationId || target.location?.locationId || null,
              name: locationName ? String(locationName) : target.location?.name || "",
            },
            STBL: mergedSTBL,
            SS: mergedSS,
            results,
          },
        },
        { new: true }
      ).lean();

      return NextResponse.json({
        success: true,
        merged: true,
        message: `${isFender ? "Fender" : "Hose"} calculation added to the existing compatibility record for ${String(operationNumber).trim()}.`,
        data: updated,
      });
    }

    let results = {};
    if (isFender) {
      results.fender = computeFender(stbl, ss);
    } else {
      results.hose = computeHose(stbl, ss);
    }

    const doc = await Compatibility.create({
      operationRef: operationRef || null,
      operationNumber: String(operationNumber).trim(),
      year: Number(year),
      location: {
        locationId: locationId || null,
        name: locationName != null ? String(locationName) : "",
      },
      STBL: stbl,
      SS: ss,
      results,
    });

    return NextResponse.json({
      success: true,
      data: doc,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
