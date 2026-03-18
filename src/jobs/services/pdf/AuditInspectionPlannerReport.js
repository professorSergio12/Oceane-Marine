import fs from "fs";
import path from "path";
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

const FORM_TITLE = "AUDITS & INSPECTION PLANNER";
const FORM_CODE_DEFAULT = "QAF-OFD-048";
const MAX_PAGES = 3;
const PAGE_MARGINS = { top: 500, right: 600, bottom: 500, left: 600 };

function buildHeaderTable(record, currentPage, totalPages, logoImage) {
  const reportDate = record.issueDate || record.updatedAt;
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
                    size: 24,
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
              infoLine("Issue Date", formatDate(reportDate)),
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

function sectionTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22 })],
    spacing: { before: 300 },
  });
}

export async function generateAuditInspectionPlannerDoc(record, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const categories = record.categories || [];
  const blocks = [];

  for (const cat of categories) {
    const title = cat.title || cat.key || "Section";
    const rows = cat.rows || [];
    const headerRow = new TableRow({
      children: [
        tableCell("Description", true),
        tableCell("Frequency", true),
        tableCell("Due By", true),
        tableCell("Status", true),
        tableCell("Auditor", true),
        tableCell("Audit Date", true),
        tableCell("Remarks", true),
      ],
    });
    const dataRows = rows.map((r) =>
      new TableRow({
        children: [
          tableCell(r.description),
          tableCell(r.frequency),
          tableCell(r.dueBy),
          tableCell(r.status),
          tableCell(r.auditorName),
          tableCell(formatDate(r.auditDate)),
          tableCell(r.remarks),
        ],
      })
    );
    const rowCount = 2 + (dataRows.length || 1);
    blocks.push({
      rowCount,
      children: [
        sectionTitle(title),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: dataRows.length ? [headerRow, ...dataRows] : [headerRow],
        }),
      ],
    });
  }

  const totalRowCount = blocks.reduce((sum, b) => sum + b.rowCount, 0) || 10;
  const totalPages = MAX_PAGES;
  const ROWS_PER_PAGE = Math.ceil(totalRowCount / totalPages) + 4;

  const sections = [];
  let sectionChildren = [
    buildHeaderTable(record, 1, totalPages, logoImage),
    new Paragraph({ spacing: { before: 200 } }),
  ];
  let rowsUsed = 0;
  let pageNum = 1;

  for (const block of blocks) {
    if (rowsUsed + block.rowCount > ROWS_PER_PAGE && rowsUsed > 0) {
      sections.push({
        properties: { page: { margin: PAGE_MARGINS } },
        children: sectionChildren,
      });
      pageNum++;
      sectionChildren = [
        buildHeaderTable(record, pageNum, totalPages, logoImage),
        new Paragraph({ spacing: { before: 200 } }),
      ];
      rowsUsed = 0;
    }
    sectionChildren = sectionChildren.concat(block.children);
    rowsUsed += block.rowCount;
  }

  if (sectionChildren.length > 0) {
    sections.push({
      properties: { page: { margin: PAGE_MARGINS } },
      children: sectionChildren,
    });
  }

  const doc = new Document({
    sections: sections.length ? sections : [{
      properties: { page: { margin: PAGE_MARGINS } },
      children: [
        buildHeaderTable(record, 1, 1, logoImage),
        new Paragraph({ spacing: { before: 200 } }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
