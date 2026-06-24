import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import JSZip from "jszip";
import { connectDB } from "@/lib/config/connection";
import Compatibility from "@/lib/mongodb/models/operations/Compatibility";
import {
  computeHose,
  computeFender,
} from "@/app/operations/sts-operations/new/compatibility/calculations";

export const maxDuration = 60;

const TEMPLATE_PATH = "public/templates/Compatibility.template.docx";

/** Escape a value for inclusion in OOXML document.xml. */
function xmlEscape(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Format a numeric value for display (trim trailing zeros, blank for null). */
function num(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  // up to 2 decimals, no trailing zeros
  return String(Math.round(n * 100) / 100);
}

function buildValues(doc) {
  const STBL = doc.STBL || {};
  const SS = doc.SS || {};
  const hose = computeHose(STBL, SS);
  const fender = computeFender(STBL, SS);

  return {
    JOB_REF: doc.operationNumber || "",
    SS_NAME: SS.name || "",
    STBL_NAME: STBL.name || "",

    // Hose
    POINT_A: num(hose.PointA),
    POINT_B: num(hose.PointB),
    POINT_C: num(hose.PointC),
    SS_MAXFB: num(SS.MaxFreeboard),
    SS_MINFB: num(SS.MinFreeboard),
    STBL_MAXFB: num(STBL.MaxFreeboard),
    STBL_MINFB: num(STBL.MinFreeboard),
    HOSE_LEN: num(hose.HoseCal),

    // Fender particulars
    SS_DWT: num(SS.DWT),
    SS_BEAM: num(SS.Beam),
    SS_DISP: num(SS.DISP),
    SS_DRAFT: num(SS.Draft),
    STBL_DWT: num(STBL.DWT),
    STBL_BEAM: num(STBL.Beam),
    STBL_DISP: num(STBL.DISP),
    STBL_DRAFT: num(STBL.Draft),

    // Fender coefficients
    EDC: num(fender.EDC),
    STBL_MASS: num(fender.STBLMassCoeff),
    SS_MASS: num(fender.SSMassCoeff),
    VDISP_STBL: num(fender.VirtDispSTBL),
    VDISP_SS: num(fender.VirtDispSS),
    CVD: num(fender.CVD),
    E_CALM: num(fender.EnergyCoeff_Calm),
    E_MOD: num(fender.EnergyCoeff_Moderate),
    E_ROUGH: num(fender.EnergyCoeff_Rough),

    // Fender selections
    F_CALM: fender.Fenderselect_Calm || "",
    F_MOD: fender.Fenderselect_Moderate || "",
    F_ROUGH: fender.Fenderselect_Rough || "",
  };
}

function sanitizeFilename(name) {
  return String(name || "Compatibility").replace(/[^\w.-]+/g, "_").slice(0, 80);
}

export async function GET(req, { params }) {
  await connectDB();
  try {
    const { id } = await params;
    const doc = await Compatibility.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const templateAbsPath = path.join(process.cwd(), TEMPLATE_PATH);
    let templateBuffer;
    try {
      templateBuffer = await fs.readFile(templateAbsPath);
    } catch {
      return NextResponse.json(
        { error: "Compatibility template not found on server" },
        { status: 500 }
      );
    }

    const zip = await JSZip.loadAsync(templateBuffer);
    let xml = await zip.file("word/document.xml").async("string");

    const values = buildValues(doc);
    for (const [tag, value] of Object.entries(values)) {
      xml = xml.split(`{{${tag}}}`).join(xmlEscape(value));
    }

    zip.file("word/document.xml", xml);
    const out = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const fileName = `Compatibility-${sanitizeFilename(doc.operationNumber)}.docx`;

    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(out.length),
      },
    });
  } catch (error) {
    console.error("Compatibility download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate document" },
      { status: 500 }
    );
  }
}
