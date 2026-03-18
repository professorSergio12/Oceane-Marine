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

// Same question labels as list page (HSE Checklist)
const hseChecklistLabels = {
  hsePolicy: "HSE Policy",
  facilityTour:
    "A facility tour including a discussion of the types of processes performed, location of bulletin boards for postings, breakrooms, restrooms, First-Aid cabinets, fire-fighting equipment, evacuation routes & assembly areas",
  reportingFire: "Reporting fire",
  occupationalHazards: "Occupational Hazards",
  injuryIllnessNearMissReporting:
    "The procedure for reporting an industrial injury, illness, near-miss accident, or an unsafe condition",
  emergencyActionPlan: "The facility Emergency Action Plan",
  wasteManagementProcedures: "Waste Management Procedures",
  ppeRequirements:
    "PPE (Personal Protective Equipment) requirements by area including the proper use, care & maintenance of such equipment",
  hazcomMsds:
    "(HazCom) - Location of MSDS sheets, summary of hazardous chemicals on site",
  spillReportingProcedures:
    "The procedure for reporting spills, and the importance of keeping containers covered",
  ergonomicsAwareness: "Ergonomics (awareness)",
  housekeepingExpectations:
    "The importance and expectations for good housekeeping",
  disciplinaryProcedure:
    "The disciplinary procedure for Safety and Environmental Violations",
};

const jobSpecificLabels = {
  safeOperationOfToolsMachinery:
    "Safe operation of any tools/machinery that may be required",
  trainingAndCertificationRequirements:
    "Training & certification requirements prior to driving a forklift or other motorized equipment",
  riskAssessmentOverview: "Risk Assessment overview",
  safeLiftingAndBackInjuryPrevention: "Safe Lifting & Back Injury Prevention",
  craneOperationAndSlingInspection: "Safe crane operation & sling inspection",
  loadingUnloadingHandlingProcedures:
    "Procedures for safely loading/unloading and handling of equipment",
};

function getSignatureBuffer(value) {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let b64 = null;
  if (trimmed.startsWith("data:image")) {
    const match = trimmed.match(/^data:[^;]+;base64,(.+)$/s);
    if (match && match[1]) b64 = match[1];
  } else if (/^[A-Za-z0-9+/=]{50,}$/.test(trimmed)) {
    b64 = trimmed;
  }
  if (!b64) return null;
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

export async function generateHseInductionChecklistDoc(report, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const reportDate = report.revisionDate || report.dateOfInduction || report.createdAt;

  const headerTable = new Table({
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
                    text: "HSE INDUCTION CHECKLIST",
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
              infoLine("Form Number", report.formNo || report.formCode || "QAF-OFD-008"),
              infoLine("Serial Number", report.serialNumber || ""),
              infoLine("Version", report.revisionNo || report.version || ""),
              infoLine("Date", formatDate(reportDate)),
            ],
          }),
        ],
      }),
    ],
  });

  const basicInfoRows = [
    ["Employee / Contractor Name", report.employeeOrContractorName || ""],
    ["Date of Induction", formatDate(report.dateOfInduction)],
    ["Location", report.location || ""],
    ["Status", report.status || ""],
    ["Submitted By", report.submittedBy || ""],
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

  const children = [
    headerTable,
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: "EMPLOYEE / CONTRACTOR DETAILS", bold: true, size: 24 })],
    }),
    basicInfoTable,
  ];

  // HSE Checklist section
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "HSE INDUCTION CHECKLIST", bold: true, size: 22 })],
    })
  );
  const hseRows = [
    new TableRow({
      children: [tableCell("Topic", true), tableCell("Discussed", true)],
    }),
  ];
  const hseChecklist = report.hseChecklist || {};
  Object.entries(hseChecklistLabels).forEach(([key, label]) => {
    hseRows.push(
      new TableRow({
        children: [
          tableCell(label, false),
          tableCell(hseChecklist[key] ? "Yes" : "No", false),
        ],
      })
    );
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: hseRows,
    })
  );

  // Job Specific Checklist section
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "As appropriate by job function & facility operation",
          bold: true,
          size: 22,
        }),
      ],
    })
  );
  const jobRows = [
    new TableRow({
      children: [tableCell("Topic", true), tableCell("Discussed", true)],
    }),
  ];
  const jobChecklist = report.jobSpecificChecklist || {};
  Object.entries(jobSpecificLabels).forEach(([key, label]) => {
    jobRows.push(
      new TableRow({
        children: [
          tableCell(label, false),
          tableCell(jobChecklist[key] ? "Yes" : "No", false),
        ],
      })
    );
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: jobRows,
    })
  );

  // Signatures section
  const sigs = report.signatures;
  if (sigs) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "SIGNATURES", bold: true, size: 22 })],
      })
    );
    const sigRows = [];
    if (sigs.employeeSignatureDate != null) {
      sigRows.push(["Employee Signature Date", formatDate(sigs.employeeSignatureDate)]);
    }
    if (sigs.employeeSignature && !getSignatureBuffer(sigs.employeeSignature)) {
      sigRows.push(["Employee Signature (text)", sigs.employeeSignature]);
    }
    if (sigRows.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: sigRows.map(([label, value]) =>
            new TableRow({
              children: [
                tableCell(label, true),
                tableCell(value || "—", false),
              ],
            })
          ),
        })
      );
    }
    let empSigBuf = getSignatureBuffer(sigs.employeeSignature);
    if (empSigBuf && empSigBuf.length > 0) {
      children.push(new Paragraph({ spacing: { before: 150 } }));
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Employee Signature: ", bold: true })],
        })
      );
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: empSigBuf,
              transformation: { width: 180, height: 60 },
            }),
          ],
        })
      );
    }
    let inductionSigBuf = getSignatureBuffer(sigs.inductionGivenBySignature);
    if (inductionSigBuf && inductionSigBuf.length > 0) {
      children.push(new Paragraph({ spacing: { before: 150 } }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Signature of Person Giving Induction: ",
              bold: true,
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: inductionSigBuf,
              transformation: { width: 180, height: 60 },
            }),
          ],
        })
      );
    }
    if (
      sigs.inductionGivenBySignature &&
      !getSignatureBuffer(sigs.inductionGivenBySignature) &&
      typeof sigs.inductionGivenBySignature === "string"
    ) {
      children.push(new Paragraph({ spacing: { before: 150 } }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Signature of Person Giving Induction: ",
              bold: true,
            }),
            new TextRun(sigs.inductionGivenBySignature.trim() || "—"),
          ],
        })
      );
    }
  }

  if (report.status === "Rejected" && report.rejectionReason) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "REJECTION REASON", bold: true, size: 22 })],
      })
    );
    children.push(new Paragraph({ children: [new TextRun(report.rejectionReason)] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 500,
              right: 600,
              bottom: 500,
              left: 600,
            },
          },
        },
        children,
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
