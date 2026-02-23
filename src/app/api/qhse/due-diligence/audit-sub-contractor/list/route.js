import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import SubContractorAudit from "@/lib/mongodb/models/qhse-due-diligence/SubContractorAudit";

export async function GET() {
  await connectDB();
  try {
    const subContractorAudits = await SubContractorAudit.find()
      .lean({ getters: true, virtuals: false });
    return NextResponse.json(
      { subContractorAudits }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500}
    );
  }
}
