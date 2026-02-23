import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectDB } from "@/lib/config/connection";
import QhseArchive from "@/lib/mongodb/models/qhse-archive/QhseArchive";
import StsBaseAuditReport from "@/lib/mongodb/models/qhse-form-checklist/StsBaseAuditReport";
import NewBaseSetupChecklist from "@/lib/mongodb/models/qhse-form-checklist/NewBaseSetupChecklist";
import StsTransferLocationQuest from "@/lib/mongodb/models/qhse-form-checklist/StsTransferLocationQuest";
import RiskAssessment from "@/lib/mongodb/models/qhse-risk-assessment/RiskAssessment";
import TrainingRecord from "@/lib/mongodb/models/qhse-training/TrainingRecord";
import KpiUpload from "@/lib/mongodb/models/qhse-kpi/KpiUpload";
import EquipmentDefect from "@/lib/mongodb/models/qhse-defect/EquipmentDefect";

const CONTENT_TYPE_MAP = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const cwd = process.cwd();

function normalizePath(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().replace(/\\/g, "/");
  return t || null;
}

function resolveFilePath(rawPath) {
  const p = normalizePath(rawPath);
  if (!p) return null;
  const candidates = [
    path.join(cwd, p),
    p.startsWith("/") ? path.join(cwd, p.slice(1)) : null,
    path.join(cwd, "public", p.startsWith("/") ? p.slice(1) : p),
  ].filter(Boolean);
  if (path.isAbsolute(p)) candidates.unshift(p);
  for (const abs of candidates) {
    try {
      if (fs.existsSync(abs)) return abs;
    } catch (_) {}
  }
  return null;
}

function resolveDefectAttachmentPath(defectId, attPath, attOriginalName) {
  if (!attPath || !defectId) return null;
  const relativePath = String(attPath).replace(/\\/g, "/").replace(/^\/+/, "");
  const allowedBase = path.join(cwd, "uploads", "equipment-defects");
  const defectDir = path.join(allowedBase, String(defectId));
  let fullPath = path.resolve(cwd, relativePath);
  const rel = path.relative(allowedBase, fullPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    fullPath = path.join(defectDir, path.basename(relativePath));
  }
  if (fs.existsSync(fullPath)) return { path: fullPath, name: attOriginalName };
  fullPath = path.join(defectDir, path.basename(attPath || ""));
  if (fs.existsSync(fullPath)) return { path: fullPath, name: attOriginalName };
  return null;
}

function streamFile(absolutePath, fileNameOverride = null) {
  const fileBuffer = fs.readFileSync(absolutePath);
  const fileName = fileNameOverride || path.basename(absolutePath);
  const fileExt = path.extname(fileName).toLowerCase();
  const contentType =
    CONTENT_TYPE_MAP[fileExt] || "application/octet-stream";
  const safeName = fileName.replace(/"/g, '\\"');
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}

async function getFilePathFromOriginal(moduleName, originalId) {
  if (!originalId) return null;
  const id = originalId.toString().trim();
  if (!id) return null;

  try {
    const mod = (moduleName || "").trim();

    if (mod === "Base Audit") {
      const doc = await StsBaseAuditReport.findById(id).lean();
      return doc?.filePath ? resolveFilePath(doc.filePath) : null;
    }
    if (mod === "New Base Setup") {
      const doc = await NewBaseSetupChecklist.findById(id).lean();
      return doc?.filePath ? resolveFilePath(doc.filePath) : null;
    }
    if (mod === "Transfer Location Questionnaire" || mod === "Transfer Location Quest") {
      const doc = await StsTransferLocationQuest.findById(id).lean();
      return doc?.filePath ? resolveFilePath(doc.filePath) : null;
    }
    if (mod === "Risk Assessment") {
      const doc = await RiskAssessment.findById(id).lean();
      if (!doc?.filePath) return null;
      const toAbs = (p) => (path.isAbsolute(p) ? p : path.join(cwd, p));
      let absPath = toAbs(doc.filePath);
      if (!fs.existsSync(absPath)) {
        const alt = String(doc.filePath).replace("risk-assessment", "risk-assesment");
        const absAlt = toAbs(alt);
        if (fs.existsSync(absAlt)) absPath = absAlt;
        else return null;
      }
      return { path: absPath, name: doc.fileName || path.basename(absPath) };
    }
    if (mod === "Training") {
      const doc = await TrainingRecord.findById(id).lean();
      const fp = doc?.attachment?.filePath;
      if (!fp) return null;
      const abs = resolveFilePath(fp);
      if (abs) return { path: abs, name: doc?.attachment?.fileName };
      return null;
    }
    if (mod === "Target KPI" || mod === "KPI") {
      const doc = await KpiUpload.findById(id).lean();
      const lp = doc?.localPath;
      if (!lp) return null;
      const abs = path.isAbsolute(lp) ? (fs.existsSync(lp) ? lp : null) : resolveFilePath(lp);
      if (abs) return { path: abs, name: doc?.originalName };
      return null;
    }
    if (mod === "Equipment Defects") {
      const doc = await EquipmentDefect.findById(id).lean();
      const att = Array.isArray(doc?.attachments) && doc.attachments[0];
      if (!att) return null;
      const resolved = resolveDefectAttachmentPath(
        id,
        att.path,
        att.originalName
      );
      return resolved;
    }
  } catch (_) {}
  return null;
}

/**
 * GET /api/qhse/archive/[id]/download
 * Returns the original file when it exists. Never returns a JSON file download.
 */
export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const doc = await QhseArchive.findById(id).lean();
    if (!doc) {
      return new NextResponse("Archive record not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const meta = doc.metadata || {};
    const firstAtt = Array.isArray(meta.attachments) && meta.attachments[0];
    const rawPath =
      doc.filePath ||
      doc.metadata?.filePath ||
      doc.metadata?.localPath ||
      meta.attachment?.filePath ||
      (firstAtt && (firstAtt.filePath || firstAtt.path)) ||
      null;

    if (rawPath) {
      let absolutePath = resolveFilePath(rawPath);
      let streamName = firstAtt?.originalName || meta?.fileName || null;
      if (!absolutePath && (doc.module || "").trim() === "Risk Assessment") {
        const toAbs = (p) => (path.isAbsolute(p) ? p : path.join(cwd, (p || "").replace(/\\/g, "/")));
        let absPath = toAbs(rawPath);
        if (!fs.existsSync(absPath)) {
          const alt = String(rawPath).replace("risk-assessment", "risk-assesment");
          const absAlt = toAbs(alt);
          if (fs.existsSync(absAlt)) absPath = absAlt;
        }
        if (absPath && fs.existsSync(absPath)) {
          absolutePath = absPath;
          if (!streamName) streamName = meta?.fileName || path.basename(absPath);
        }
      }
      if (absolutePath) {
        return streamFile(absolutePath, streamName);
      }
      if (doc.module === "Equipment Defects" && doc.originalId && firstAtt) {
        const resolved = resolveDefectAttachmentPath(
          doc.originalId.toString(),
          firstAtt.path || firstAtt.filePath,
          firstAtt.originalName
        );
        if (resolved) return streamFile(resolved.path, resolved.name);
      }
    }

    if (doc.fileUrl && typeof doc.fileUrl === "string" && doc.fileUrl.trim()) {
      const url = doc.fileUrl.trim();
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return NextResponse.redirect(url);
      }
      const localPath = resolveFilePath(url.startsWith("/") ? url.slice(1) : url);
      if (localPath) return streamFile(localPath);
    }

    const originalId = doc.originalId?.toString?.() || doc.originalId;
    const moduleName = doc.module?.trim?.() || doc.module;
    const fromOriginal = await getFilePathFromOriginal(moduleName, originalId);
    if (fromOriginal) {
      if (typeof fromOriginal === "object" && fromOriginal.path) {
        return streamFile(fromOriginal.path, fromOriginal.name || undefined);
      }
      return streamFile(fromOriginal);
    }

    return new NextResponse("No file available for this archive.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Archive download error:", error);
    return new NextResponse("Server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
