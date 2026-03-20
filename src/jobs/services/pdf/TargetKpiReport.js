import fs from "node:fs";
import path from "node:path";
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

const FORM_TITLE = "Target KPI";
const FORM_CODE_DEFAULT = "HSE-001A";
const BEIGE_FILL = "E8DCC4";

function cell(text, opts = {}) {
  const { bold = false, shading = null, columnSpan, alignment } = opts;
  const textValue = text !== null && text !== undefined ? String(text) : "";
  return new TableCell({
    shading: shading ? { fill: shading } : undefined,
    columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: alignment || AlignmentType.LEFT,
        children: [new TextRun({ text: textValue, bold })],
      }),
    ],
  });
}

/**
 * Generate Word document for Target KPI.
 * @param {object} record - TargetKpi document (formCode, serialNumber, year, rows)
 * @param {string} fullPath - Absolute path to write the .docx file
 */
export async function generateTargetKpiDoc(record, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {
    // no logo
  }

  const formCode = record.formCode || FORM_CODE_DEFAULT;
  const serialNumber = record.serialNumber ?? "";
  const year = record.year == null ? "" : String(record.year);

  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
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
                children: [new TextRun("OCEANE GROUP")],
              }),
        ],
      }),
      new TableCell({
        width: { size: 44, type: WidthType.PERCENTAGE },
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
        width: { size: 28, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Form No: ", bold: true }),
              new TextRun(formCode),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Serial: ", bold: true }),
              new TextRun(serialNumber),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Year: ", bold: true }),
              new TextRun(year),
            ],
          }),
        ],
      }),
    ],
  });

  const rows = Array.isArray(record.rows) ? record.rows : [];
  const tableHeaderRow = new TableRow({
    children: [
      cell("Title", { bold: true, shading: BEIGE_FILL }),
      cell(`Targets for ${year}`, { bold: true, shading: BEIGE_FILL, alignment: AlignmentType.CENTER }),
      cell("Quarter 1", { bold: true, shading: BEIGE_FILL, alignment: AlignmentType.CENTER }),
      cell("Quarter 2", { bold: true, shading: BEIGE_FILL, alignment: AlignmentType.CENTER }),
      cell("Quarter 3", { bold: true, shading: BEIGE_FILL, alignment: AlignmentType.CENTER }),
      cell("Quarter 4", { bold: true, shading: BEIGE_FILL, alignment: AlignmentType.CENTER }),
      cell("Targets Achieved", { bold: true, shading: BEIGE_FILL, alignment: AlignmentType.CENTER }),
    ],
  });

  const dataRows = rows.map((row) =>
    new TableRow({
      children: [
        cell(row.title ?? ""),
        cell(row.targetForYear != null ? String(row.targetForYear) : "", { alignment: AlignmentType.CENTER }),
        cell(row.quarter1 != null ? String(row.quarter1) : "", { alignment: AlignmentType.CENTER }),
        cell(row.quarter2 != null ? String(row.quarter2) : "", { alignment: AlignmentType.CENTER }),
        cell(row.quarter3 != null ? String(row.quarter3) : "", { alignment: AlignmentType.CENTER }),
        cell(row.quarter4 != null ? String(row.quarter4) : "", { alignment: AlignmentType.CENTER }),
        cell(row.targetsAchieved != null ? String(row.targetsAchieved) : "", { alignment: AlignmentType.CENTER }),
      ],
    })
  );

  const kpiTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...dataRows],
  });

  const sections = [
    {
      properties: {
        page: {
          margin: { top: 500, right: 600, bottom: 500, left: 600 },
        },
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow],
        }),
        new Paragraph({ spacing: { before: 300 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Target KPI for the year ${year}. Quarterly targets and achievements are listed below.`,
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 200 } }),
        kpiTable,
      ],
    },
  ];

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
