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

const FORM_TITLE = "SUB-CONTRACTOR AUDIT";
const FORM_CODE_DEFAULT = "QAF-OFD-055";
const PAGE_MARGINS = { top: 500, right: 600, bottom: 500, left: 600 };

function buildHeaderTable(record, currentPage, totalPages, logoImage) {
  const reportDate = record.revisionDate || record.auditCompletedBy?.signedAt || record.updatedAt;
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
              infoLine("Revision No", record.revisionNo || ""),
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

function sectionTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22 })],
    spacing: { before: 300 },
  });
}

function keyValueTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          tableCell(label, true),
          tableCell(value ?? "—"),
        ],
      })
    ),
  });
}

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

export async function generateSubContractorAuditDoc(record, fullPath) {
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const auditBy = record.auditCompletedBy || {};
  const approvedBy = record.contractorApprovedBy || {};

  const sectionChildren = [
    buildHeaderTable(record, 1, 1, logoImage),
    new Paragraph({ spacing: { before: 200 } }),
    sectionTitle("Sub-Contractor Details"),
    keyValueTable([
      ["Sub-Contractor Name", record.subcontractorName],
      ["Address", record.subcontractorAddress],
      ["Service Type", record.serviceType],
      ["Contact Person", record.contactPerson],
      ["Email", record.emailOfContactPerson],
      ["Phone", record.phoneOfContactPerson],
      ["Operating Areas", record.operatingAreas],
    ]),
    sectionTitle("Compliance"),
    keyValueTable([
      ["Trade License Copy Available", yesNo(record.tradeLicenseCopyAvailable)],
      ["Has HSE Policy", yesNo(record.hasHSEPolicy)],
      ["Audits Subcontractors", yesNo(record.auditsSubcontractors)],
      ["Has Insurance", yesNo(record.hasInsurance)],
      ["Insurance Details", record.insuranceDetails],
      ["ISO Certifications", Array.isArray(record.isoCertifications) ? record.isoCertifications.join(", ") : ""],
    ]),
    sectionTitle("Office Use"),
    keyValueTable([
      ["Audit Completed By", auditBy.name],
      ["Designation", auditBy.designation],
      ["Signed At", formatDate(auditBy.signedAt)],
      ["Signature (text)", auditBy.signatureText],
      ["Contractor Approved By", approvedBy.name],
      ["Designation", approvedBy.designation],
      ["Signed At", formatDate(approvedBy.signedAt)],
      ["Signature (text)", approvedBy.signatureText],
    ]),
  ];

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: PAGE_MARGINS } },
        children: sectionChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(fullPath, buffer);
}
