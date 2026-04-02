import { NextResponse } from "next/server";
import { connectDB } from "@/lib/config/connection";
import Certificate from "@/lib/mongodb/models/pms/Certificate";
import path from "path";
import fs from "fs/promises";
import { assertPmsPermission } from "@/lib/auth/pmsGuard";

export async function POST(req) {
    const guard = await assertPmsPermission("canCreate");
    if (!guard.ok) return guard.response;
    await connectDB();

    try {
        const formData = await req.formData();

        const locationName = formData.get("locationName");
        const equipmentName = formData.get("equipmentName");
        const equipmentType = formData.get("equipmentType");
        const testedBy = formData.get("testedBy");
        const manufacturingFile = formData.get("manufacturingFile");
        const testFile = formData.get("testFile");

        // Validate text fields
        if (!locationName || !locationName.trim()) {
            return NextResponse.json(
                { message: "Location name is required" },
                { status: 400 }
            );
        }
        if (!equipmentName || !equipmentName.trim()) {
            return NextResponse.json(
                { message: "Equipment name is required" },
                { status: 400 }
            );
        }
        if (!equipmentType || !equipmentType.trim()) {
            return NextResponse.json(
                { message: "Equipment type is required" },
                { status: 400 }
            );
        }
        if (!testedBy || !testedBy.trim()) {
            return NextResponse.json(
                { message: "Tested by is required" },
                { status: 400 }
            );
        }

        // Validate files - check if they are valid File objects
        if (!manufacturingFile || typeof manufacturingFile === "string" || !manufacturingFile.name || manufacturingFile.size === 0) {
            return NextResponse.json(
                { message: "Manufacturing certificate file is required" },
                { status: 400 }
            );
        }
        if (!testFile || typeof testFile === "string" || !testFile.name || testFile.size === 0) {
            return NextResponse.json(
                { message: "Test certificate file is required" },
                { status: 400 }
            );
        }

        // Create directory structure: location/equipmentName/equipmentType/
        const sanitize = (str) => str.replace(/[^a-zA-Z0-9-_]/g, "_");
        const baseDir = path.join(
            process.cwd(),
            "public/uploads/certificates",
            sanitize(locationName.trim()),
            sanitize(equipmentName.trim()),
            sanitize(equipmentType.trim())
        );
        await fs.mkdir(baseDir, { recursive: true });

        // Save Manufacturing Certificate
        const manufacturingBuffer = Buffer.from(await manufacturingFile.arrayBuffer());
        const manufacturingFileName = `manufacturing-${Date.now()}-${sanitize(manufacturingFile.name)}`;
        const manufacturingFilePath = path.join(baseDir, manufacturingFileName);
        await fs.writeFile(manufacturingFilePath, manufacturingBuffer);
        const manufacturingFileUrl = `/uploads/certificates/${sanitize(locationName.trim())}/${sanitize(equipmentName.trim())}/${sanitize(equipmentType.trim())}/${manufacturingFileName}`;

        // Save Test Certificate
        const testBuffer = Buffer.from(await testFile.arrayBuffer());
        const testFileName = `test-${Date.now()}-${sanitize(testFile.name)}`;
        const testFilePath = path.join(baseDir, testFileName);
        await fs.writeFile(testFilePath, testBuffer);
        const testFileUrl = `/uploads/certificates/${sanitize(locationName.trim())}/${sanitize(equipmentName.trim())}/${sanitize(equipmentType.trim())}/${testFileName}`;

        const cert = await Certificate.create({
            locationName: locationName.trim(),
            equipmentName: equipmentName.trim(),
            equipmentType: equipmentType.trim(),
            testedBy: testedBy.trim(),
            manufacturingCertificate: {
                fileUrl: manufacturingFileUrl,
                originalFileName: manufacturingFile.name,
            },
            testCertificate: {
                fileUrl: testFileUrl,
                originalFileName: testFile.name,
            },
        });

        return NextResponse.json({ data: cert }, { status: 201 });
    } catch (err) {
        console.error("Certificate creation error:", err);
        return NextResponse.json(
            { message: err.message || "Upload failed", error: err.message },
            { status: 500 }
        );
    }
}
