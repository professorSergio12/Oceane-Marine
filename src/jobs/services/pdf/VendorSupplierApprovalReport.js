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

const supplyOfPartsLabels = {
  technicalComparison: "Technical Comparison",
  commercialComparison: "Commercial Comparison",
  legalEntityForServiceOrSupply: "Legal Entity for Service or Supply",
  agreesToOceaneTerms: "Agrees to Oceane Terms & Conditions",
  infrastructureAndFacilities: "Infrastructure & Facilities",
  previousExperienceExpertise: "Previous Experience / Expertise",
};

const supplyOfServicesLabels = {
  skilledManpowerAvailability: "Skilled Manpower Availability",
  contractorCertifications: "Contractor Certifications",
  hseSystemDueDiligence: "HSE System / Due Diligence",
  insuranceAndWorkPermit: "Insurance & Work Permit",
  previousExperienceYears: "Previous Experience (Years)",
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

export async function generateVendorSupplierApprovalDoc(report, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const reportDate = report.revisionDate || report.date || report.createdAt;

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
                    text: "VENDOR / SUPPLIER APPROVAL",
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
              infoLine("Form Number", report.formCode || report.formNo || "QAF-OFD-037"),
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
    ["Vendor Name", report.vendorName || ""],
    ["Vendor Address", report.vendorAddress || ""],
    ["Date", formatDate(report.date)],
    ["Year", report.year != null ? String(report.year) : ""],
    ["Status", report.status || ""],
    ["Requested By", report.requestedBy || ""],
    ["For Accounts (Sign)", report.forAccountsSign || ""],
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
      children: [new TextRun({ text: "BASIC INFORMATION", bold: true, size: 24 })],
    }),
    basicInfoTable,
  ];

  // Supply of Parts
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "For Supply of Parts", bold: true, size: 22 })],
    })
  );
  const partsRows = [
    new TableRow({
      children: [tableCell("Criterion", true), tableCell("Rating (1-4)", true)],
    }),
  ];
  const supplyOfParts = report.supplyOfParts || {};
  Object.entries(supplyOfPartsLabels).forEach(([key, label]) => {
    partsRows.push(
      new TableRow({
        children: [
          tableCell(label, false),
          tableCell(supplyOfParts[key] != null ? String(supplyOfParts[key]) : "—", false),
        ],
      })
    );
  });
  partsRows.push(
    new TableRow({
      children: [
        tableCell("Percentage Score", true),
        tableCell(`${supplyOfParts.percentageScore != null ? supplyOfParts.percentageScore : 0}%`, false),
      ],
    })
  );
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: partsRows,
    })
  );

  // Supply of Services
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "For Supply of Services", bold: true, size: 22 })],
    })
  );
  const servicesRows = [
    new TableRow({
      children: [tableCell("Criterion", true), tableCell("Rating (1-4)", true)],
    }),
  ];
  const supplyOfServices = report.supplyOfServices || {};
  Object.entries(supplyOfServicesLabels).forEach(([key, label]) => {
    servicesRows.push(
      new TableRow({
        children: [
          tableCell(label, false),
          tableCell(supplyOfServices[key] != null ? String(supplyOfServices[key]) : "—", false),
        ],
      })
    );
  });
  servicesRows.push(
    new TableRow({
      children: [
        tableCell("Percentage Score", true),
        tableCell(`${supplyOfServices.percentageScore != null ? supplyOfServices.percentageScore : 0}%`, false),
      ],
    })
  );
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: servicesRows,
    })
  );

  // Overall Result
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Overall Result", bold: true, size: 22 })],
    })
  );
  const overallRows = [
    ["Overall Percentage Score", `${report.overallPercentageScore != null ? report.overallPercentageScore : 0}%`],
    ["Approved Vendor Eligible (≥80%)", report.approvedVendorEligible ? "Yes" : "No"],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: overallRows.map(([label, value]) =>
        new TableRow({
          children: [tableCell(label, true), tableCell(value, false)],
        })
      ),
    })
  );

  // Signatures
  children.push(new Paragraph({ spacing: { before: 300 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Signatures", bold: true, size: 22 })],
    })
  );
  const sigRows = [
    ["Requested By", report.requestedBy || ""],
    ["For Accounts (Sign)", report.forAccountsSign || ""],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: sigRows.map(([label, value]) =>
        new TableRow({
          children: [tableCell(label, true), tableCell(value || "—", false)],
        })
      ),
    })
  );
  if (report.requestedBySignatureImage) {
    const buf = report.requestedBySignatureImage.startsWith("data:")
      ? getSignatureBuffer(report.requestedBySignatureImage)
      : readSignatureFromPath(report.requestedBySignatureImage);
    if (buf && buf.length > 0) {
      children.push(new Paragraph({ spacing: { before: 150 } }));
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Requested By Signature: ", bold: true })],
        })
      );
      children.push(
        new Paragraph({
          children: [new ImageRun({ data: buf, transformation: { width: 180, height: 60 } })],
        })
      );
    }
  }
  if (report.forAccountsSignSignatureImage) {
    const buf = report.forAccountsSignSignatureImage.startsWith("data:")
      ? getSignatureBuffer(report.forAccountsSignSignatureImage)
      : readSignatureFromPath(report.forAccountsSignSignatureImage);
    if (buf && buf.length > 0) {
      children.push(new Paragraph({ spacing: { before: 150 } }));
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "For Accounts Signature: ", bold: true })],
        })
      );
      children.push(
        new Paragraph({
          children: [new ImageRun({ data: buf, transformation: { width: 180, height: 60 } })],
        })
      );
    }
  }

  if (report.approvedBy || report.approvedAt) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Approval", bold: true, size: 22 })],
      })
    );
    const approvalRows = [];
    if (report.approvedBy) approvalRows.push(["Approved By", report.approvedBy]);
    if (report.approvedAt) approvalRows.push(["Approved At", formatDate(report.approvedAt)]);
    if (approvalRows.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: approvalRows.map(([label, value]) =>
            new TableRow({
              children: [tableCell(label, true), tableCell(value || "—", false)],
            })
          ),
        })
      );
    }
  }

  if (report.rejectionReason) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Rejection Reason", bold: true, size: 22 })],
      })
    );
    children.push(new Paragraph({ children: [new TextRun(report.rejectionReason)] }));
  }

  if (report.instructionsToAccountsDepartment) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Instructions to Accounts Department", bold: true, size: 22 })],
      })
    );
    children.push(new Paragraph({ children: [new TextRun(report.instructionsToAccountsDepartment)] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 500, right: 600, bottom: 500, left: 600 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}

function readSignatureFromPath(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  try {
    const absPath = filePath.startsWith("/")
      ? path.join(process.cwd(), "public", filePath.slice(1))
      : path.join(process.cwd(), filePath);
    if (fs.existsSync(absPath)) return fs.readFileSync(absPath);
  } catch {}
  return null;
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
