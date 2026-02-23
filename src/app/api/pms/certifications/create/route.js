import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Certificate from "@/lib/mongodb/models/pms/Certificate";
import path from "path";
import fs from "fs/promises";

export async function POST(req) {
    await connectDB();

    try {
        const formData = await req.formData();

        const locationName = formData.get("locationName");
        const version = formData.get("version");
        const file = formData.get("file");

        if (!locationName || !version || !file) {
            return NextResponse.json(
                { message: "All fields are required" },
                { status: 400 }
            );
        }

        const uploadDir = path.join(process.cwd(), "public/uploads/certificates");
        await fs.mkdir(uploadDir, { recursive: true });

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, fileBuffer);

        const cert = await Certificate.create({
            locationName,
            version,
            fileUrl: `/uploads/certificates/${fileName}`,
            originalFileName: file.name,
        });

        return NextResponse.json({ data: cert }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { message: "Upload failed" },
            { status: 500 }
        );
    }
}
