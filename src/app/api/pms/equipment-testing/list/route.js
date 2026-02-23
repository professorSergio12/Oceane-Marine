import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Equipment from "@/lib/mongodb/models/pms/Equipment";

export async function GET(req) {
    await connectDB();

    try {
        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get("year"));

        if (!year) {
            return NextResponse.json(
                { message: "Year is required" },
                { status: 400 }
            );
        }

        const start = new Date(`${year}-01-01`);
        const end = new Date(`${year}-12-31`);

        const equipments = await Equipment.find({
            nextTestDate: { $gte: start, $lte: end },
            status: "ACTIVE"
        }).select(
            "equipmentCode equipmentType lastTestDate nextTestDate"
        );

        return NextResponse.json(
            { data: equipments },
            { status: 200 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
