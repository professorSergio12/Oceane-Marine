import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { connectDB } from "@/lib/config/connection";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import { HARDCOPY_DOC_PREFIX } from "@/lib/utils/sts-linked-form-file";

/**
 * Hardcopy attachments for linked form cards.
 *
 * POST accepts the raw file as the request body (operationRef, formTarget, fileName in the
 * query) and streams it straight to disk, so large files never sit in server memory.
 * This route is excluded from the auth middleware (src/middleware.js) because the middleware
 * copies request bodies in memory; every handler here checks the session itself.
 * Multipart form data (field "file") is still accepted for small files from older clients.
 */
const MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
const MAX_LABEL = "1 GB";
const HARDCOPY_DIR_PREFIX = "/uploads/sts-operations/checklist-hardcopies/";

function sanitizeOriginalName(name) {
  const base = (name || "file").replace(/[^\w.\- ()[\]]/g, "_").slice(0, 180);
  return base || "file";
}

class TooLargeError extends Error {}

async function requireEditor() {
  const sessionUser = await getSessionUser();
  const role = sessionUser?.operationsRole;
  if (!sessionUser || (role !== "admin" && role !== "editor")) return null;
  return sessionUser;
}

const forbidden = () =>
  NextResponse.json(
    { success: false, error: "Forbidden: Operations admin or editor required" },
    { status: 403 }
  );

/** Today's upload folder (absolute) and its public path. */
async function prepareTarget(originalName) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const relDir = `${HARDCOPY_DIR_PREFIX}${y}/${m}/${d}`;
  const absDir = path.join(process.cwd(), "public", relDir);
  await fs.mkdir(absDir, { recursive: true });
  const safeOriginal = sanitizeOriginalName(originalName);
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeOriginal}`;
  return {
    safeOriginal,
    absPath: path.join(absDir, fileName),
    dbPath: `${relDir}/${fileName}`,
  };
}

/** Stream a web ReadableStream to disk, stopping (and deleting the part file) above MAX_BYTES. */
async function streamToDisk(webStream, absPath) {
  let written = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      written += chunk.length;
      if (written > MAX_BYTES) cb(new TooLargeError(`File too large (max ${MAX_LABEL})`));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(webStream), limiter, createWriteStream(absPath));
  } catch (err) {
    await fs.unlink(absPath).catch(() => {});
    throw err;
  }
  return written;
}

export async function POST(req) {
  let savedAbsPath = null;
  try {
    const sessionUser = await requireEditor();
    if (!sessionUser) return forbidden();

    await connectDB();

    const contentType = req.headers.get("content-type") || "";
    const isMultipart = contentType.startsWith("multipart/form-data");
    const { searchParams } = new URL(req.url);

    let operationRef;
    let formTarget;
    let multipartFile = null;
    let originalName;

    if (isMultipart) {
      const formData = await req.formData();
      operationRef = String(formData.get("operationRef") || "").trim();
      formTarget = String(formData.get("formTarget") || "__GENERAL__").trim();
      multipartFile = formData.get("file");
      if (!multipartFile || typeof multipartFile === "string" || !multipartFile.size) {
        return NextResponse.json({ success: false, error: "A file is required" }, { status: 400 });
      }
      originalName = multipartFile.name;
    } else {
      operationRef = String(searchParams.get("operationRef") || "").trim();
      formTarget = String(searchParams.get("formTarget") || "__GENERAL__").trim();
      originalName = searchParams.get("fileName") || "file";
      const declared = Number(req.headers.get("content-length") || 0);
      if (declared > MAX_BYTES) {
        return NextResponse.json(
          { success: false, error: `File too large (max ${MAX_LABEL})` },
          { status: 413 }
        );
      }
      if (!req.body || declared === 0) {
        return NextResponse.json({ success: false, error: "The file is empty" }, { status: 400 });
      }
    }

    if (!operationRef) {
      return NextResponse.json({ success: false, error: "operationRef is required" }, { status: 400 });
    }

    // Check the operation before writing anything to disk
    const operation = await StsOperation.findOne({ Operation_Ref_No: operationRef, isLatest: true })
      .select("_id")
      .lean();
    if (!operation) {
      return NextResponse.json(
        { success: false, error: "No operation found for this reference" },
        { status: 404 }
      );
    }

    const target = await prepareTarget(originalName);
    savedAbsPath = target.absPath;
    if (isMultipart) {
      if (multipartFile.size > MAX_BYTES) {
        return NextResponse.json(
          { success: false, error: `File too large (max ${MAX_LABEL})` },
          { status: 413 }
        );
      }
      await streamToDisk(multipartFile.stream(), target.absPath);
    } else {
      await streamToDisk(req.body, target.absPath);
    }

    const documentType = `${HARDCOPY_DOC_PREFIX}${formTarget}`;
    const result = await StsOperation.updateOne(
      // Still the current version? (someone may have saved the operation meanwhile)
      { Operation_Ref_No: operationRef, isLatest: true },
      {
        $push: {
          documents: {
            documentType,
            filePath: target.dbPath,
            source: "CHECKLIST_HARDCOPY",
            status: "GENERATED",
            uploadedAt: new Date(),
            uploadedBy: sessionUser._id,
          },
        },
      }
    );
    if (result.matchedCount === 0) {
      throw new Error("The operation changed while uploading. Please try again.");
    }
    savedAbsPath = null; // attached: keep the file

    return NextResponse.json({
      success: true,
      message: "Hardcopy attached to operation",
      data: {
        operationRef,
        documentType,
        filePath: target.dbPath,
        originalName: target.safeOriginal,
      },
    });
  } catch (error) {
    // Nothing attached → do not leave the file behind
    if (savedAbsPath) await fs.unlink(savedAbsPath).catch(() => {});
    if (error instanceof TooLargeError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 413 });
    }
    console.error("checklist-hardcopy POST:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * Remove an uploaded hardcopy from the operation's current version.
 * Body: { operationRef, filePath }. Only CHECKLIST_HARDCOPY entries can be removed here.
 * The file stays on disk because earlier versions of the operation still reference it.
 */
export async function DELETE(req) {
  try {
    const sessionUser = await getSessionUser();
    const role = sessionUser?.operationsRole;
    if (!sessionUser || (role !== "admin" && role !== "editor")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Operations admin or editor required" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const operationRef = String(body.operationRef || "").trim();
    const filePath = String(body.filePath || "").trim();
    if (!operationRef || !filePath) {
      return NextResponse.json(
        { success: false, error: "operationRef and filePath are required" },
        { status: 400 }
      );
    }

    const operation = await StsOperation.findOne({ Operation_Ref_No: operationRef, isLatest: true })
      .select("_id documents")
      .lean();
    if (!operation) {
      return NextResponse.json(
        { success: false, error: "No operation found for this reference" },
        { status: 404 }
      );
    }
    const removed = (operation.documents || []).find(
      (d) => d?.source === "CHECKLIST_HARDCOPY" && d.filePath === filePath
    );
    if (!removed) {
      return NextResponse.json(
        { success: false, error: "Attachment not found (it may already have been removed)" },
        { status: 404 }
      );
    }

    await StsOperation.updateOne(
      { _id: operation._id },
      { $pull: { documents: { source: "CHECKLIST_HARDCOPY", filePath } } }
    );

    // The removed entry is returned so the client can offer Undo (PUT)
    return NextResponse.json({ success: true, message: "Attachment removed", data: removed });
  } catch (error) {
    console.error("checklist-hardcopy DELETE:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Remove failed" },
      { status: 500 }
    );
  }
}

/**
 * Undo a removal: re-attach a hardcopy entry returned by DELETE.
 * Body: { operationRef, document: { documentType, filePath, uploadedAt } }.
 * Only files that are still in the hardcopy upload folder can be re-attached.
 */
export async function PUT(req) {
  try {
    const sessionUser = await getSessionUser();
    const role = sessionUser?.operationsRole;
    if (!sessionUser || (role !== "admin" && role !== "editor")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Operations admin or editor required" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const operationRef = String(body.operationRef || "").trim();
    const doc = body.document || {};
    const filePath = String(doc.filePath || "").trim();
    const documentType = String(doc.documentType || "").trim();

    if (
      !operationRef ||
      !filePath.startsWith(HARDCOPY_DIR_PREFIX) ||
      filePath.includes("..") ||
      !documentType.startsWith(HARDCOPY_DOC_PREFIX)
    ) {
      return NextResponse.json({ success: false, error: "Invalid attachment" }, { status: 400 });
    }

    try {
      await fs.access(path.join(process.cwd(), "public", filePath));
    } catch {
      return NextResponse.json(
        { success: false, error: "The file is no longer on the server" },
        { status: 404 }
      );
    }

    const uploadedAt = doc.uploadedAt ? new Date(doc.uploadedAt) : new Date();
    const result = await StsOperation.updateOne(
      // Skip if it is already attached (e.g. Undo clicked twice)
      { Operation_Ref_No: operationRef, isLatest: true, "documents.filePath": { $ne: filePath } },
      {
        $push: {
          documents: {
            documentType,
            filePath,
            source: "CHECKLIST_HARDCOPY",
            status: "GENERATED",
            uploadedAt: Number.isNaN(uploadedAt.getTime()) ? new Date() : uploadedAt,
            uploadedBy: sessionUser._id,
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      const exists = await StsOperation.exists({ Operation_Ref_No: operationRef, isLatest: true });
      if (!exists) {
        return NextResponse.json(
          { success: false, error: "No operation found for this reference" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true, message: "Attachment restored" });
  } catch (error) {
    console.error("checklist-hardcopy PUT:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Restore failed" },
      { status: 500 }
    );
  }
}
