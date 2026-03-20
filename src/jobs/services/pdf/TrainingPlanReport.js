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

const FORM_TITLE = "Annual Training Matrix";
const FORM_CODE_DEFAULT = "QAF-OFD-038";
const BEIGE_FILL = "E8DCC4";

const MONTH_PAIR_LABELS = {
  0: "Jan-Feb",
  1: "Jan-Feb",
  2: "Mar-Apr",
  3: "Mar-Apr",
  4: "May-Jun",
  5: "May-Jun",
  6: "Jul-Aug",
  7: "Jul-Aug",
  8: "Sep-Oct",
  9: "Sep-Oct",
  10: "Nov-Dec",
  11: "Nov-Dec",
};

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

function getMonthPairLabel(plannedDate) {
  if (!plannedDate) return "";
  const d = new Date(plannedDate);
  if (Number.isNaN(d.getTime())) return "";
  return MONTH_PAIR_LABELS[d.getMonth()] || "";
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
 * Generate Word document for Annual Training Matrix (Training Plan).
 * @param {object} plan - TrainingPlan document (formCode, serialNumber, year, planItems, status)
 * @param {string} fullPath - Absolute path to write the .docx file
 */
export async function generateTrainingPlanDoc(plan, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {
    // no logo
  }

  const formCode = plan.formCode || FORM_CODE_DEFAULT;
  const serialNumber = plan.serialNumber ?? "";
  const year = plan.year == null ? "" : String(plan.year);
  const status = plan.status ?? "Approved";

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

  const planItems = Array.isArray(plan.planItems) ? plan.planItems : [];
  const tableHeaderRow = new TableRow({
    children: [
      cell("Sl No.", { bold: true, shading: BEIGE_FILL }),
      cell("Month Period", { bold: true, shading: BEIGE_FILL }),
      cell("Planned Date", { bold: true, shading: BEIGE_FILL }),
      cell("Topic", { bold: true, shading: BEIGE_FILL }),
      cell("Instructor", { bold: true, shading: BEIGE_FILL }),
      cell("Description", { bold: true, shading: BEIGE_FILL }),
    ],
  });

  const dataRows = planItems.map((item, idx) =>
    new TableRow({
      children: [
        cell(idx + 1),
        cell(getMonthPairLabel(item.plannedDate)),
        cell(formatDate(item.plannedDate)),
        cell(item.topic ?? ""),
        cell(item.instructor ?? ""),
        cell(item.description ?? ""),
      ],
    })
  );

  const matrixTable = new Table({
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
              text: "Annual training plan (matrix) for the year. Planned dates, topics, instructors and descriptions are listed below.",
            }),
          ],
        }),
        new Paragraph({ spacing: { before: 200 } }),
        matrixTable,
      ],
    },
  ];

  const doc = new Document({ sections });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
