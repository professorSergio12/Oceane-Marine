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

const FORM_TITLE = "Drill Report";
const FORM_CODE_DEFAULT = "";
const BEIGE_FILL = "E8DCC4";

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

function cell(text, opts = {}) {
  const { bold = false, shading = null, columnSpan } = opts;
  const textValue = text !== null && text !== undefined ? String(text) : "";
  return new TableCell({
    shading: shading ? { fill: shading } : undefined,
    columnSpan,
    children: [
      new Paragraph({
        children: [new TextRun({ text: textValue, bold })],
      }),
    ],
  });
}

/**
 * Generate Word document for a Drill Report.
 * @param {object} report - DrillReport document (formCode, serialNumber, drillNo, drillDate, location, drillScenario, participants, incidentProgression, status)
 * @param {string} fullPath - Absolute path to write the .docx file
 */
export async function generateDrillReportDoc(report, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {
    // no logo
  }

  const formCode = report.formCode || FORM_CODE_DEFAULT;
  const serialNumber = report.serialNumber ?? "";
  const status = report.status ?? "Draft";

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
              new TextRun(formCode || "-"),
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
              new TextRun({ text: "Status: ", bold: true }),
              new TextRun(status),
            ],
          }),
        ],
      }),
    ],
  });

  const infoRows = [
    new TableRow({
      children: [
        cell("Drill No.", { shading: BEIGE_FILL }),
        cell(report.drillNo ?? ""),
        cell("Drill Date", { shading: BEIGE_FILL }),
        cell(formatDate(report.drillDate)),
      ],
    }),
    new TableRow({
      children: [
        cell("Location", { shading: BEIGE_FILL }),
        cell(report.location ?? "", { columnSpan: 3 }),
      ],
    }),
    new TableRow({
      children: [
        cell("Drill Scenario", { shading: BEIGE_FILL }),
        cell(report.drillScenario ?? "", { columnSpan: 3 }),
      ],
    }),
  ];

  const participants = Array.isArray(report.participants) ? report.participants : [];
  const participantsHeaderRow = new TableRow({
    children: [
      cell("Sl No.", { bold: true, shading: BEIGE_FILL }),
      cell("Name", { bold: true, shading: BEIGE_FILL }),
      cell("Role", { bold: true, shading: BEIGE_FILL }),
    ],
  });
  const participantsDataRows = participants.map((row, idx) =>
    new TableRow({
      children: [
        cell(idx + 1),
        cell(row.name ?? ""),
        cell(row.role ?? ""),
      ],
    })
  );

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
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: infoRows,
        }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({
          children: [new TextRun({ text: "Participants", bold: true })],
        }),
        new Paragraph({ spacing: { before: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [participantsHeaderRow, ...participantsDataRows],
        }),
        ...(report.incidentProgression
          ? [
              new Paragraph({ spacing: { before: 200 } }),
              new Paragraph({
                children: [new TextRun({ text: "Incident Progression", bold: true })],
              }),
              new Paragraph({ spacing: { before: 100 } }),
              new Paragraph({
                children: [new TextRun(report.incidentProgression)],
              }),
            ]
          : []),
      ],
    },
  ];

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
