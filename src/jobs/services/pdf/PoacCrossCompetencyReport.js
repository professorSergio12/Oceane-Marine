import fs from "fs";
import {
  Document,
  Header,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
} from "docx";
import {
  GENERAL_EVALUATION_CATEGORIES,
  OFFICE_EVALUATION_CATEGORIES,
  POAC_CROSS_DEFAULT_AREAS as DEFAULT_AREAS,
} from "./poacCrossCompetencyEvaluationData.js";
import { buildQhseDocxHeaderTable, buildDocxMeta, docxImageType } from "./shared/qhseDocxHeader.js";
import { loadSignatureImage } from "./shared/loadSignatureImage.js";

const FORM_TITLE = "POAC Cross Competency Evaluation";
const FORM_CODE_DEFAULT = "QAF-OFD-009";
const BEIGE_FILL = "E8DCC4"; // light tan/beige for headers and labels
const PAGE_MARGINS = { top: 500, right: 600, bottom: 500, left: 600, header: 300 };

function buildHeaderTable(record) {
  const meta = buildDocxMeta(record, FORM_CODE_DEFAULT);
  return buildQhseDocxHeaderTable({ formTitle: FORM_TITLE, meta });
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

function getSignatureBuffer(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  // Whole-value match: image data can contain these letters by chance
  if (!trimmed || /^(not available|n\/a)$/i.test(trimmed)) return null;
  return loadSignatureImage(trimmed, "POAC-CrossCompetency");
}

export async function generatePoacCrossCompetencyDoc(record, fullPath) {
  const blocks = [];
  const firstPageChildren = [];

  // --- Intro paragraph ---
  const introText =
    "This cross audit is to be carried out by a nominated POAC for another POAC handling the STS operation. This audit will be reviewed by QHSE Manager or Director of Operation as required and it will be determined if POAC (Auditee) require any training.";
  firstPageChildren.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun(introText)],
    })
  );

  // --- General Information Table (6 rows, 4 columns) ---
  const genInfoRows = [
    [
      cell("Name of POAC", { shading: BEIGE_FILL }),
      cell(record.nameOfPOAC ?? "", { columnSpan: 3 }),
    ],
    [
      cell("Date", { shading: BEIGE_FILL }),
      cell(formatDate(record.evaluationDate)),
      cell("Location", { shading: BEIGE_FILL }),
      cell(record.location ?? ""),
    ],
    [
      cell("Job Ref #", { shading: BEIGE_FILL }),
      cell(record.jobRefNo ?? ""),
      cell("Type of Operation", { shading: BEIGE_FILL }),
      cell(record.typeOfOperation ?? ""),
    ],
    [
      cell("Lead POAC", { shading: BEIGE_FILL }),
      cell(record.leadPOAC ?? ""),
      cell("Weather Condition", { shading: BEIGE_FILL }),
      cell(record.weatherCondition ?? ""),
    ],
    [
      cell("Discharging vessel", { shading: BEIGE_FILL }),
      cell(record.dischargingVessel ?? ""),
      cell("Deadweight", { shading: BEIGE_FILL }),
      cell(record.deadweightDischarging != null ? String(record.deadweightDischarging) : ""),
    ],
    [
      cell("Receiving vessel", { shading: BEIGE_FILL }),
      cell(record.receivingVessel ?? ""),
      cell("Deadweight", { shading: BEIGE_FILL }),
      cell(record.deadweightReceiving != null ? String(record.deadweightReceiving) : ""),
    ],
  ].map((cells) => new TableRow({ children: cells }));
  firstPageChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: genInfoRows,
    })
  );

  // --- Performance levels instruction ---
  const instructionText =
    "Levels of Performance: 1= Unacceptable, 2= Needs Improvement, 3=Meets Expectation, 4= Exceeds Expectation, 5=Outstanding. Require specific comments of auditor in case rating of performance is below 3";
  firstPageChildren.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: instructionText, italics: true })],
    })
  );

  // --- Checklist: build all rows then split into chunks so first page gets content + header on every page ---
  const evaluationItems = record.evaluationItems || [];
  const itemBySrNo = {};
  evaluationItems.forEach((item) => {
    itemBySrNo[item.srNo] = item;
  });
  const checklistHeader = (ratingTitle) =>
    new TableRow({
      tableHeader: true, // repeats at the top of every page the table runs onto
      children: [
        cell("Sr. No.", { bold: true, shading: BEIGE_FILL }),
        cell("Areas Audited", { bold: true, shading: BEIGE_FILL }),
        cell(ratingTitle, { bold: true, shading: BEIGE_FILL }),
        cell("Remarks", { bold: true, shading: BEIGE_FILL }),
      ],
    });
  const checklistRows = (categories) => {
    const rows = [];
    for (const cat of categories) {
      rows.push(
        new TableRow({
          children: [
            cell("", { shading: BEIGE_FILL }),
            cell(cat.name, { bold: true, shading: BEIGE_FILL, columnSpan: 2 }),
            cell("", { shading: BEIGE_FILL }),
          ],
        })
      );
      for (let srNo = cat.start; srNo <= cat.end; srNo++) {
        const item = itemBySrNo[srNo];
        const area = item?.area || DEFAULT_AREAS[srNo] || "";
        const evalVal =
          item?.evaluation != null && item?.evaluation !== undefined
            ? String(item.evaluation)
            : "";
        const remarks = item?.remarks ?? "";
        rows.push(
          new TableRow({
            cantSplit: true,
            children: [
              cell(srNo),
              cell(area),
              cell(evalVal),
              cell(remarks),
            ],
          })
        );
      }
    }
    return rows;
  };
  firstPageChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [checklistHeader("Evaluation"), ...checklistRows(GENERAL_EVALUATION_CATEGORIES)],
    })
  );
  blocks.push({ children: firstPageChildren });

  // --- Lead POAC's Comment (beige title bar, content, signature block) ---
  const leadPoacRows = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: BEIGE_FILL },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Lead POAC's Comment", bold: true })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [
            new Paragraph({
              children: [new TextRun(record.leadPOACComment || "")],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell("Name", { shading: BEIGE_FILL }),
        cell(record.leadPOACName ?? ""),
        cell("Date", { shading: BEIGE_FILL }),
        cell(formatDate(record.leadPOACDate)),
      ],
    }),
  ];
  const leadSigBuf = getSignatureBuffer(record.leadPOACSignature);
  leadPoacRows.push(
    new TableRow({
      children: [
        cell("Signature", { shading: BEIGE_FILL }),
        leadSigBuf
          ? new TableCell({
              columnSpan: 3,
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: docxImageType(leadSigBuf),
                      data: leadSigBuf,
                      transformation: { width: 180, height: 60 },
                    }),
                  ],
                }),
              ],
            })
          : cell("", { columnSpan: 3 }),
      ],
    })
  );
  blocks.push({
    children: [
      new Paragraph({ spacing: { before: 400 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: leadPoacRows,
      }),
    ],
  });

  // --- Office Requirements (rated 1-5) ---
  const officeRows = [
    checklistHeader("Level of Performance"),
    ...checklistRows(OFFICE_EVALUATION_CATEGORIES),
  ];
  blocks.push({
    children: [
      new Paragraph({ spacing: { before: 400 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: officeRows,
      }),
    ],
  });

  // --- Operation & Operations Support Team Comments ---
  const opsRows = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: BEIGE_FILL },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Operation & Operations Support Team Comments",
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [
            new Paragraph({
              children: [new TextRun(record.opsSupportTeamComment || "")],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        cell("Ops Team Name", { shading: BEIGE_FILL }),
        cell(record.opsTeamName ?? ""),
        cell("Signature", { shading: BEIGE_FILL }),
        getSignatureBuffer(record.opsTeamSignature)
          ? new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: docxImageType(getSignatureBuffer(record.opsTeamSignature)),
                      data: getSignatureBuffer(record.opsTeamSignature),
                      transformation: { width: 120, height: 40 },
                    }),
                  ],
                }),
              ],
            })
          : cell(""),
      ],
    }),
    new TableRow({
      children: [
        cell("Date", { shading: BEIGE_FILL }),
        cell(formatDate(record.opsTeamDate)),
        cell(""),
        cell(""),
      ],
    }),
    new TableRow({
      children: [
        cell("Ops. Team Supdt. Name", { shading: BEIGE_FILL }),
        cell(record.opsTeamSupdtName ?? ""),
        cell("Signature", { shading: BEIGE_FILL }),
        getSignatureBuffer(record.opsTeamSupdtSignature)
          ? new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: docxImageType(getSignatureBuffer(record.opsTeamSupdtSignature)),
                      data: getSignatureBuffer(record.opsTeamSupdtSignature),
                      transformation: { width: 120, height: 40 },
                    }),
                  ],
                }),
              ],
            })
          : cell(""),
      ],
    }),
    new TableRow({
      children: [
        cell("Date", { shading: BEIGE_FILL }),
        cell(formatDate(record.opsTeamSupdtDate)),
        cell(""),
        cell(""),
      ],
    }),
  ];
  blocks.push({
    children: [
      new Paragraph({ spacing: { before: 300 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: opsRows,
      }),
    ],
  });

  // One section with a real Word header: Word repeats it on every page and only fills in the
  // PAGE / NUMPAGES fields there. In the document body they stay at their stored "1 of 1".
  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: PAGE_MARGINS } },
        headers: {
          default: new Header({
            children: [buildHeaderTable(record), new Paragraph({ spacing: { before: 200 } })],
          }),
        },
        children: blocks.flatMap((block) => block.children),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
