import fs from "fs";
import path from "path";
import { createQhsePdfHeaderController } from "./shared/qhseRepeatingHeaderPdf.js";
import { pdfSafeText } from "./shared/pdfSafeText.js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  ImageRun,
} from "docx";

const FORM_TITLE = "NEW BASE SETUP CHECKLIST";
const FORM_CODE_DEFAULT = "QAF-OFD-051";

function buildNewBaseSetupHeaderTable(record, currentPage, totalPages, logoImage) {
  const reportDate = record.date || record.uploadedAt;
  const pageText = totalPages > 1 ? `${currentPage} of ${totalPages}` : "";
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              logoImage
                ? new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: logoImage,
                        transformation: { width: 120, height: 60 },
                      }),
                    ],
                  })
                : new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun("OCEANE")],
                  }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: FORM_TITLE,
                    bold: true,
                    size: 28,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [
              infoLine("Form Number", record.formCode || FORM_CODE_DEFAULT),
              infoLine("Serial Number", record.serialNumber || ""),
              infoLine("Version", record.version || ""),
              infoLine("Date", formatDate(reportDate)),
              ...(pageText ? [infoLine("Page", pageText)] : []),
            ],
          }),
        ],
      }),
    ],
  });
}

function infoLine(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun(value ?? ""),
    ],
  });
}

function tableCell(text, bold = false) {
  const textValue = text !== null && text !== undefined ? String(text) : "";
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: textValue, bold })],
      }),
    ],
  });
}

function formatDate(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Generates a DOCX for New Base Setup Checklist with header on every page
 * (same pattern as OPS-OFD-004/005 and STS Equipment Base Stock Level).
 * @param {Object} record - DB record (formCode, serialNumber, baseName, version, date, uploadedBy, etc.)
 * @param {string} fullPath - Output file path
 */
export async function generateNewBaseSetupChecklistDoc(record, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const basicInfoRows = [
    ["Base Name", record.baseName ?? ""],
    ["Date", formatDate(record.date)],
    ["Uploaded By", record.uploadedBy?.name ?? ""],
    ["Form Code", record.formCode || FORM_CODE_DEFAULT],
    ["Serial Number", record.serialNumber ?? ""],
    ["Version", record.version ?? ""],
  ];

  const basicInfoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: basicInfoRows.map(([label, value]) =>
      new TableRow({
        children: [
          tableCell(label, true),
          tableCell(value || "________________________"),
        ],
      })
    ),
  });

  const totalPages = 1;
  const pageMargins = { top: 500, right: 600, bottom: 500, left: 600 };

  const sectionChildren = [
    buildNewBaseSetupHeaderTable(record, 1, totalPages, logoImage),
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: "BASIC INFORMATION", bold: true, size: 24 })],
    }),
    basicInfoTable,
  ];

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: pageMargins } },
        children: sectionChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}

/**
 * PDF export: same BASIC INFORMATION as Word + repeating QHSE header.
 * @param {object} record – lean NewBaseSetupChecklist document
 * @returns {Promise<Buffer>}
 */
export async function generateNewBaseSetupChecklistPdf(record) {
  const jspdfModule = await import("jspdf");
  const JsPDF =
    jspdfModule.jsPDF ??
    (typeof jspdfModule.default === "function" ? jspdfModule.default : null);
  if (!JsPDF) {
    throw new Error("jsPDF constructor not found");
  }
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const reportDate = record.date || record.uploadedAt;
  const headerCtl = createQhsePdfHeaderController({
    formTitle: FORM_TITLE,
    metaPairs: [
      ["Form Number", record.formCode || FORM_CODE_DEFAULT],
      ["Serial Number", record.serialNumber || ""],
      ["Version", String(record.version || "")],
      ["Date", formatDate(reportDate)],
    ],
  });
  const tableMargins = headerCtl.getAutoTableMargins();
  const m = headerCtl.sideMarginMm;

  const gridStyles = {
    fontSize: 9,
    cellPadding: 3,
    textColor: [30, 30, 30],
    lineColor: [200, 200, 200],
    lineWidth: 0.2,
    overflow: "linebreak",
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BASIC INFORMATION", m, headerCtl.tableTopMm - 5);

  const basicBody = [
    [
      "Base Name",
      pdfSafeText(record.baseName) || "________________________",
    ],
    [
      "Date",
      pdfSafeText(formatDate(record.date)) || "________________________",
    ],
    [
      "Uploaded By",
      pdfSafeText(record.uploadedBy?.name) || "________________________",
    ],
    [
      "Form Code",
      pdfSafeText(record.formCode || FORM_CODE_DEFAULT) ||
        "________________________",
    ],
    [
      "Serial Number",
      pdfSafeText(record.serialNumber) || "________________________",
    ],
    [
      "Version",
      pdfSafeText(record.version) || "________________________",
    ],
  ];

  autoTable(doc, {
    startY: headerCtl.tableTopMm + 5,
    margin: tableMargins,
    willDrawPage: headerCtl.willDrawPage,
    head: [],
    body: basicBody,
    theme: "grid",
    styles: gridStyles,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 48 },
      1: { cellWidth: "auto" },
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
