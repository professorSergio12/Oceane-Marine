import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import MOCManagementChange from "@/lib/mongodb/models/qhse-moc/mocs-managementChange";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    const query = {};
    if (year) {
      const yearNum = Number.parseInt(year, 10);
      if (!Number.isNaN(yearNum)) {
        query.$or = [
          { year: yearNum },
          {
            $and: [
              { $or: [{ year: { $exists: false } }, { year: null }] },
              {
                initiationDate: {
                  $gte: new Date(`${yearNum}-01-01T00:00:00.000Z`),
                  $lte: new Date(`${yearNum}-12-31T23:59:59.999Z`),
                },
              },
            ],
          },
        ];
      }
    }

    const moc = await MOCManagementChange.find(query)
      .populate("changeMadeBy", "name email")
      .sort({ createdAt: -1 });

    // Available years: from year field and from initiationDate
    const allMocs = await MOCManagementChange.find({})
      .select("year initiationDate")
      .lean();
    const years = [
      ...new Set(
        allMocs.flatMap((m) => {
          const fromYear = m.year != null && !Number.isNaN(Number(m.year)) ? [Number(m.year)] : [];
          const fromDate =
            m.initiationDate && !Number.isNaN(new Date(m.initiationDate).getTime())
              ? [new Date(m.initiationDate).getFullYear()]
              : [];
          return [...fromYear, ...fromDate];
        })
      ),
    ]
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a);

    return NextResponse.json({
      success: true,
      data: moc,
      years: years.length > 0 ? years : [new Date().getFullYear()],
    });
  } catch (error) {
    console.error("MOC list error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

