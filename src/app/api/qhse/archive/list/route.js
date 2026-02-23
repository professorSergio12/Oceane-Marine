import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import QhseArchive from "@/lib/mongodb/models/qhse-archive/QhseArchive";

export async function GET(req) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const moduleFilter = searchParams.get("module");

    const all = await QhseArchive.find().select("year module").lean();
    const years = [
      ...new Set(
        all
          .map((i) => i.year)
          .filter((y) => typeof y === "number" && !Number.isNaN(y))
      ),
    ].sort((a, b) => b - a);
    const modules = [...new Set(all.map((i) => i.module).filter(Boolean))].sort();

    const query = {};
    if (year) {
      const yr = Number.parseInt(year, 10);
      if (!Number.isNaN(yr)) query.year = yr;
    } else {
      query.year = years.length ? years[0] : new Date().getFullYear();
    }
    if (moduleFilter && moduleFilter.trim()) {
      query.module = moduleFilter.trim();
    }

    const items = await QhseArchive.find(query)
      .sort({ archivedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: items, years, modules });
  } catch (error) {
    console.error("Archive list error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
