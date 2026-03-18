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

const FORM_TITLE = "POAC Cross Competency Evaluation";
const FORM_CODE_DEFAULT = "QAF-OFD-009";
const BEIGE_FILL = "E8DCC4"; // light tan/beige for headers and labels
const ROWS_PER_PAGE = 32; // one section ≈ one page so header repeats; first section has intro+table+instruction+first chunk (~31 rows)
const PAGE_MARGINS = { top: 500, right: 600, bottom: 500, left: 600 };
const CHECKLIST_CHUNK_SIZE = 22; // rows per checklist table chunk (header + 21 data rows)

const EVALUATION_CATEGORIES = [
  { name: "Prior to commencement of Operations", start: 1, end: 9 },
  { name: "Mobilization", start: 10, end: 15 },
  { name: "Rigging of vessel", start: 16, end: 23 },
  { name: "Approach and mooring operation", start: 24, end: 42 },
  { name: "Hose connection", start: 43, end: 48 },
  { name: "Cargo operations", start: 49, end: 51 },
  { name: "Hose draining and disconnection", start: 52, end: 56 },
  { name: "Unmooring", start: 57, end: 62 },
  { name: "De-Mobilization", start: 63, end: 66 },
  { name: "General", start: 67, end: 71 },
  { name: "Office Requirements", start: 72, end: 75 },
];

const DEFAULT_AREAS = {};
[
  "Suitability of vessels checked. (Mooring plans, STS plans and Q88s reviewed)",
  "Risk assessments and JPO reviewed",
  "Ship standard Questionnaire reviewed",
  "Checked if nighttime berthing is allowed",
  "Weather forecasts reviewed",
  "Traffic Density with regards to STS Location Considered",
  "Suitable anchoring location with regard to vessel draft etc",
  "Length of hose string requirements checked",
  "Copies of valid STS gear equipment certification",
  "Information shared with the vessel for arrival and POAC boarding",
  "Safety meeting with support craft crew",
  "Condition of Fender and Hoses checked",
  "Moorings and additional equipment checked (i.e., split pins, bolts, nuts, gaskets, personnel basket)",
  "Conditions of hose lifting slings used",
  "Transfer of equipment on support craft",
  "Safety meeting conducted with crew and Master",
  "Communication skills with crew",
  "Inspection of Mooring Winches and associated mooring gears",
  "Safety awareness",
  "Communication with support craft",
  "Rigging of Primary /Secondary Fenders",
  "Readiness to heave up anchor /Readiness of Mooring stations",
  "Navigation warning broadcast",
  "Safety Meeting conducted with crew. (Including snap back zone awareness)",
  "Approach and Mooring Plan discussed with Master",
  "ME Testing prior to use",
  "Agreed means of communication VHF Channel",
  "Discussed emergency procedures and ME speed -Manoeuvring",
  "OCIMF Checklist complied with",
  "Proper handover of command",
  "Communication with bridge team / exchange of information",
  "Regular monitoring of traffic and vessel's speed",
  "Control of mooring operation",
  "Check status of impressed current system",
  "Interaction",
  "Status of radars",
  "Parallel landing",
  "Angle of approach",
  "Positioning of vessel",
  "Checking helm indicator",
  "Manoeuvring vessels to anchor",
  "Communication during approach and mooring",
  "Safety Meeting conducted with crew",
  "Crane's operational readiness and condition",
  "Checking manifold connection",
  "Cargo hazard precautions explained to crew. (i.e., H2S monitors for personnel)",
  "MSDS for the cargo obtained",
  "Hose String and gasket connections",
  "Safety Meeting conducted with crew. (Including instruction to regularly tend vessel and fender moorings)",
  "OCIMF STS Checklists complied",
  "Deck rounds and Manifold pressure monitored",
  "Authorities informed of completion of transfer",
  "Safety meeting conducted with crew",
  "Cargo hose draining and hose disconnection",
  "Hoses blanked with bolts inward",
  "Informed office to arrange support craft for demobilisation",
  "Safety Meeting conducted with crew",
  "Avoided crossing ahead",
  "OCIMF STS Checklists completed",
  "Ship handling skills",
  "Regular monitoring of Swell and wind direction",
  "Unmooring plan discussed",
  "Safety meeting conducted with crew",
  "Communication skills with crew",
  "Offloading hoses to the support craft",
  "De-rigging Primary /Secondary Fenders",
  "Control during operations",
  "Weather forecasts reviewed regularly",
  "Care of STS equipment",
  "Use of PPE",
  "General Safety awareness",
  "Regular operational updates",
  "Timely reporting of issues (Advisement of issues in good time to allow for prompt action)",
  "General communication with Operations Team",
  "Correctly completing and efficiently submitting STS documentation",
].forEach((area, i) => {
  DEFAULT_AREAS[i + 1] = area;
});

function buildHeaderTable(record, currentPage, totalPages, logoImage) {
  const pageText = totalPages > 1 ? `${currentPage} of ${totalPages}` : "";
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
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
              infoLine("Form No", record.formCode || FORM_CODE_DEFAULT),
              infoLine("Rev No", record.revNo || "1.0"),
              infoLine("Rev Date", formatDate(record.revDate || record.updatedAt)),
              infoLine("Approved by", record.approvedBy ?? ""),
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
  if (!trimmed || /not available|n\/a/i.test(trimmed)) return null;
  try {
    if (trimmed.startsWith("data:image")) {
      const base64Data = trimmed.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(base64Data, "base64");
    }
    if (/^[A-Za-z0-9+/=]{50,}$/.test(trimmed)) {
      return Buffer.from(trimmed, "base64");
    }
  } catch {
    // ignore
  }
  return null;
}

export async function generatePoacCrossCompetencyDoc(record, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {
    // no logo
  }

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
  const checklistHeaderRow = new TableRow({
    children: [
      cell("Sr. No.", { bold: true, shading: BEIGE_FILL }),
      cell("Areas Audited", { bold: true, shading: BEIGE_FILL }),
      cell("Level of Performance", { bold: true, shading: BEIGE_FILL }),
      cell("Remarks", { bold: true, shading: BEIGE_FILL }),
    ],
  });
  const allChecklistRows = [checklistHeaderRow];
  for (const cat of EVALUATION_CATEGORIES) {
    allChecklistRows.push(
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
      allChecklistRows.push(
        new TableRow({
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
  // First chunk goes on page 1 with intro + gen info + instruction; rest as separate blocks (header each page)
  const checklistChunks = [];
  for (let start = 0; start < allChecklistRows.length; start += CHECKLIST_CHUNK_SIZE) {
    const end = Math.min(start + CHECKLIST_CHUNK_SIZE, allChecklistRows.length);
    const chunkRows = allChecklistRows.slice(start, end);
    const needHeader = start > 0;
    const tableRows = needHeader ? [checklistHeaderRow, ...chunkRows] : chunkRows;
    checklistChunks.push({
      rowCount: tableRows.length,
      table: new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      }),
    });
  }
  // First block = intro (2) + gen info (6) + instruction (1) + first checklist chunk (~22) = fills page 1
  const firstChunk = checklistChunks[0];
  if (firstChunk) {
    firstPageChildren.push(firstChunk.table);
    blocks.push({
      rowCount: 2 + 6 + 1 + firstChunk.rowCount,
      children: firstPageChildren,
    });
  } else {
    blocks.push({
      rowCount: 2 + 6 + 1,
      children: firstPageChildren,
    });
  }
  // Remaining checklist chunks each get their own block (new section = new page with header)
  for (let i = 1; i < checklistChunks.length; i++) {
    blocks.push({
      rowCount: checklistChunks[i].rowCount,
      children: [checklistChunks[i].table],
    });
  }

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
    rowCount: leadPoacRows.length,
    children: [
      new Paragraph({ spacing: { before: 400 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: leadPoacRows,
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
    rowCount: opsRows.length,
    children: [
      new Paragraph({ spacing: { before: 300 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: opsRows,
      }),
    ],
  });

  // First pass: count how many sections we will have so header can show "Page X of Y"
  let rowsUsedCount = 0;
  let sectionCount = 1;
  for (const block of blocks) {
    if (rowsUsedCount + block.rowCount > ROWS_PER_PAGE && rowsUsedCount > 0) {
      sectionCount++;
      rowsUsedCount = 0;
    }
    rowsUsedCount += block.rowCount;
  }
  const totalPages = sectionCount;

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
    sections: sections.length
      ? sections
      : [
          {
            properties: { page: { margin: PAGE_MARGINS } },
            children: [
              buildHeaderTable(record, 1, 1, logoImage),
              new Paragraph({ spacing: { before: 200 } }),
            ],
          },
        ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
