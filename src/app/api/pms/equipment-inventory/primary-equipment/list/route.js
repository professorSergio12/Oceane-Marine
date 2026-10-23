import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Equipment from "@/lib/mongodb/models/pms/Equipment";
import { assertPmsPermission } from "@/lib/auth/pmsGuard";
import { attachLastTestDates } from "@/lib/pms/equipmentLastTest";

export async function GET() {
    const guard = await assertPmsPermission("canView");
    if (!guard.ok) return guard.response;
    try {
        await connectDB();
        
        const equipments = await Equipment.find()
            .sort({ createdAt: -1 })
            .lean();
        await attachLastTestDates(equipments);

        return NextResponse.json({ equipments });
    } catch (error) {
        console.error("List Equipment Error:", error);
        console.error("Error stack:", error.stack);
        return NextResponse.json(
            { 
                error: error.message || "Failed to load equipments",
                message: error.message || "Failed to load equipments"
            },
            { status: 500 }
        );
    }
}