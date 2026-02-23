import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import VendorSupplierApproval from "@/lib/mongodb/models/qhse-form-checklist/VendorSupplierApproval";

export async function GET(req) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");

    let forms = await VendorSupplierApproval.find()
      .sort({ createdAt: -1 })
      .lean();

    // If year filter is provided, filter by year field or extract from date
    if (yearParam) {
      const year = Number.parseInt(yearParam, 10);
      forms = forms.filter((form) => {
        if (form.year) {
          return form.year === year;
        }
        // Fallback: extract year from date if year field is missing
        if (form.date) {
          const dateYear = new Date(form.date).getFullYear();
          return dateYear === year;
        }
        return false;
      });
    }

    // Sort by year (descending), then by createdAt
    forms.sort((a, b) => {
      const yearA = a.year || (a.date ? new Date(a.date).getFullYear() : 0);
      const yearB = b.year || (b.date ? new Date(b.date).getFullYear() : 0);
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return NextResponse.json({ success: true, data: forms }, { status: 200 });
  } catch (error) {
    console.error("Vendor Supplier Approval List Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
