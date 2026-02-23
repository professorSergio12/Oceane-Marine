import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import TrainingPlan from "@/lib/mongodb/models/qhse-training/TrainingPlan";
import path from "node:path";
import { saveQhseFile } from "@/lib/utils/qhse-file-storage";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    if (year) {
      const plan = await TrainingPlan.findOne({
        year: Number.parseInt(year, 10),
        status: "Approved",
      }).sort({ createdAt: -1 });

      return NextResponse.json({
        success: true,
        data: plan || null,
        message: plan
          ? "Approved training plan found"
          : "No approved training plan for this year",
      });
    }

    const plans = await TrainingPlan.find({ status: "Approved" }).select(
      "year"
    );

    const years = [...new Set(plans.map((p) => p.year))].sort((a, b) => b - a);

    return NextResponse.json({ success: true, data: years });
  } catch (error) {
    console.error("Get Training Plan Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const formData = await req.formData();

    const planItemsStr = formData.get("planItems");
    if (!planItemsStr) {
      return NextResponse.json(
        { success: false, error: "planItems is required" },
        { status: 400 }
      );
    }

    const planItems = JSON.parse(planItemsStr);

    if (!Array.isArray(planItems) || planItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "planItems array is required" },
        { status: 400 }
      );
    }

    const years = planItems.map((item) =>
      new Date(item.plannedDate).getFullYear()
    );

    if (new Set(years).size > 1) {
      return NextResponse.json(
        {
          success: false,
          error: "All plan items must belong to the same year",
        },
        { status: 400 }
      );
    }

    const planYear = years[0];

    const monthPairFiles = {};
    const monthPairs = ["Jan-Feb", "Mar-Apr", "May-Jun", "Jul-Aug", "Sep-Oct", "Nov-Dec"];
    const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"]);
    const MAX_SIZE = 25 * 1024 * 1024;

    for (const monthPair of monthPairs) {
      const file = formData.get(`monthPairFile_${monthPair}`);

      if (file && typeof file !== "string" && file.name && file.size > 0) {
        if (file.size > MAX_SIZE) {
          return NextResponse.json(
            { success: false, error: `${monthPair} file exceeds 25MB limit` },
            { status: 400 }
          );
        }

        const ext = path.extname(file.name).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
          return NextResponse.json(
            { success: false, error: `Invalid file type for ${monthPair}` },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const filePath = await saveQhseFile({
          formCode: "QAF-OFD-038",
          date: new Date(planYear, 0, 1),
          title: monthPair,
          fileType: "documents",
          fileName: file.name,
          buffer,
        });

        monthPairFiles[monthPair] = {
          filePath,
          fileName: file.name,
        };
      }
    }

    const planData = {
      planItems,
      status: "Approved",
    };

    if (Object.keys(monthPairFiles).length > 0) {
      planData.monthPairFiles = monthPairFiles;
    }

    const newPlan = await TrainingPlan.create(planData);

    return NextResponse.json({ success: true, data: newPlan }, { status: 201 });
  } catch (error) {
    console.error("Training Plan Creation Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
