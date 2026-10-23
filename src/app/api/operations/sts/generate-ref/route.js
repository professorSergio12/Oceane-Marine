import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Counter from "@/lib/mongodb/models/generateFormCode";
import { formatStsOperationRef } from "@/lib/operations/formatStsOperationRef";
import { getRegisterMaxSeqByYear } from "@/lib/operations/stsRegisterExport";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";

/** Highest sequence among app operations for a year (refs like "2026-541", incl. manual ones). */
async function getMaxAppSeq(year) {
  const refs = await StsOperation.distinct("Operation_Ref_No", {
    Operation_Ref_No: { $regex: `^${year}-\\d+` },
  });
  return refs.reduce((max, ref) => {
    const n = Number(/^\d{4}-(\d+)/.exec(ref)?.[1]);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");

    // Use provided year or current year
    const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();

    if (Number.isNaN(year)) {
      return NextResponse.json(
        { success: false, error: "Invalid year parameter" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Never hand out a number already used — in the historical Excel register
    // (e.g. 2026-540) or by an operation entered in the app (incl. manual refs).
    const usedSeq = Math.max(
      (await getRegisterMaxSeqByYear())[String(year)] || 0,
      await getMaxAppSeq(year)
    );
    await Counter.updateOne(
      { key: "STS_OPERATION", year },
      { $max: { seq: usedSeq } },
      { upsert: true }
    );

    let counter;
    let operationRef;
    do {
      counter = await Counter.findOneAndUpdate(
        { key: "STS_OPERATION", year },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      operationRef = formatStsOperationRef(year, counter.seq);
    } while (await StsOperation.exists({ Operation_Ref_No: operationRef }));

    return NextResponse.json(
      {
        success: true,
        operationRef,
        year,
        sequence: counter.seq,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Operation Ref Generation Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate operation ref" },
      { status: 500, headers: corsHeaders }
    );
  }
}
