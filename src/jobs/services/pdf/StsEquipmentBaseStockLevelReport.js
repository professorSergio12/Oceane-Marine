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

const ROWS_PER_PAGE = 28;
const BASIC_INFO_ROW_COUNT = 6;

function buildStsHeaderTable(report, currentPage, totalPages, logoImage) {
  const reportDate = report.revisionDate || report.createdAt;
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
                    text: "STS EQUIPMENT BASE STOCK LEVEL",
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
              infoLine("Form Number", report.formCode || "QAF-OFD-013"),
              infoLine("Serial Number", report.serialNumber || ""),
              infoLine("Version", report.version || ""),
              infoLine("Date", formatDate(reportDate)),
              ...(pageText ? [infoLine("Page", pageText)] : []),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function generateStsEquipmentBaseStockLevelDoc(report, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const basicInfoRows = [
    ["Year", report.year != null ? String(report.year) : ""],
    ["Status", report.status || ""],
    ["Filled By", report.filledBy?.name || ""],
    ["Role at Submission", report.filledBy?.roleAtSubmission || ""],
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

  const basicInfoBlock = [
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: "BASIC INFORMATION", bold: true, size: 24 })],
    }),
    basicInfoTable,
  ];

  const categories = report.equipmentCategories || [];
  const categoryBlocks = [];
  let totalRowCount = BASIC_INFO_ROW_COUNT;
  for (const cat of categories) {
    const title = cat.subCategory
      ? `${cat.categoryName} – ${cat.subCategory}`
      : cat.categoryName;
    const items = cat.items || [];
    const itemRows = items.length
      ? [
          new TableRow({
            children: [
              tableCell("Item Name", true),
              tableCell("Qty in Use", true),
              tableCell("Qty Spare", true),
              tableCell("Condition", true),
              tableCell("Comments", true),
            ],
          }),
          ...items.map((item) =>
            new TableRow({
              children: [
                tableCell(item.name || "", false),
                tableCell(item.quantityInUse != null ? String(item.quantityInUse) : "—", false),
                tableCell(item.quantitySpare != null ? String(item.quantitySpare) : "—", false),
                tableCell(item.overallCondition || "—", false),
                tableCell(item.additionalComments || "—", false),
              ],
            })
          ),
        ]
      : [];
    const blockRowCount = 2 + (itemRows.length ? itemRows.length : 1);
    totalRowCount += blockRowCount;
    categoryBlocks.push({
      rowCount: blockRowCount,
      children: [
        new Paragraph({ spacing: { before: 300 } }),
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 22 })],
        }),
        ...(items.length === 0
          ? [new Paragraph({ children: [new TextRun("No items.")] })]
          : [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: itemRows,
              }),
            ]),
      ],
    });
  }

  const totalPages = Math.max(1, Math.ceil(totalRowCount / ROWS_PER_PAGE));
  const pageMargins = { top: 500, right: 600, bottom: 500, left: 600 };

  const sections = [];
  let blockIndex = 0;
  let pageNum = 1;
  let rowsUsedOnPage = 0;
  const firstPageCapacity = ROWS_PER_PAGE - BASIC_INFO_ROW_COUNT;

  let sectionChildren = [
    buildStsHeaderTable(report, pageNum, totalPages, logoImage),
    ...basicInfoBlock,
  ];
  rowsUsedOnPage = BASIC_INFO_ROW_COUNT;

  while (blockIndex < categoryBlocks.length) {
    const block = categoryBlocks[blockIndex];
    const fitsOnCurrentPage =
      pageNum === 1
        ? rowsUsedOnPage + block.rowCount <= firstPageCapacity
        : rowsUsedOnPage + block.rowCount <= ROWS_PER_PAGE;
    if (fitsOnCurrentPage) {
      sectionChildren = sectionChildren.concat(block.children);
      rowsUsedOnPage += block.rowCount;
      blockIndex++;
    } else {
      sections.push({
        properties: { page: { margin: pageMargins } },
        children: sectionChildren,
      });
      pageNum++;
      sectionChildren = [
        buildStsHeaderTable(report, pageNum, totalPages, logoImage),
        new Paragraph({ spacing: { before: 200 } }),
      ];
      rowsUsedOnPage = 0;
    }
  }

  if (sectionChildren.length > 0) {
    sections.push({
      properties: { page: { margin: pageMargins } },
      children: sectionChildren,
    });
  }

  const doc = new Document({
    sections: sections.length ? sections : [
      {
        properties: { page: { margin: pageMargins } },
        children: [
          buildStsHeaderTable(report, 1, 1, logoImage),
          ...basicInfoBlock,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}

function infoLine(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun(value || ""),
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
