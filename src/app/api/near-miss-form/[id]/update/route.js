import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import NearMiss from "@/lib/mongodb/models/qhse-near-miss/NearMiss";

export async function PUT(req, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const body = await req.json();
    const { remarksByReviewer } = body || {};
    
    const nearMiss = await NearMiss.findById(id);
    if (!nearMiss) {
      return NextResponse.json(
        { error: "Near miss not found" },
        { status: 404 }
      );
    }
    
    if (nearMiss.status === "Reviewed") {
      return NextResponse.json(
        { error: "Near miss already reviewed" },
        { status: 400 }
      );
    }
    
    nearMiss.status = "Reviewed";
    if (remarksByReviewer !== undefined) {
      nearMiss.remarksByReviewer = remarksByReviewer || "";
    }
    
    await nearMiss.save();
    
    return NextResponse.json(
      { 
        message: "Near miss updated successfully", 
        data: nearMiss 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Near Miss Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update near miss" }, 
      { status: 500 }
    );
  }
}
