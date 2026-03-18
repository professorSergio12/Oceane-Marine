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

export async function generateTransferAuditReportDoc(report, fullPath) {
  /* ================= LOAD IMAGES ================= */
  let logoImage = null;
  try {
    logoImage = fs.readFileSync(
      path.join(process.cwd(), "public/image/oceane-marine-docs.png")
    );
  } catch {}

  const reportDate = report.header?.date || report.revisionDate || report.createdAt;

  /* ================= HEADER TABLE (same structure as Base Audit) ================= */
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
                    text: "STS TRANSFER AUDIT REPORT",
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
              infoLine("Form Number", report.formCode || "QAF-OFD-003"),
              infoLine("Serial Number", report.serialNumber || ""),
              infoLine("Version", report.version || ""),
              infoLine("Date", formatDate(reportDate)),
            ],
          }),
        ],
      }),
    ],
  });

  /* ================= BASIC INFORMATION TABLE (metadata same style as Base Audit) ================= */
  const basicInfoRows = [
    ["Location", report.header?.locationName || ""],
    ["Job No", report.header?.jobNo || ""],
    ["Date", formatDate(report.header?.date)],
    ["Discharging Vessel", report.header?.dischargingVessel || ""],
    ["Receiving Vessel", report.header?.receivingVessel || ""],
    ["Status", report.status || ""],
    ["Completed By", report.completedBy?.name || ""],
    ["Completed Date", formatDate(report.completedBy?.date)],
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

  const sectionTitles = [
    { key: "sectionA_PrePlanning", title: "Section A – Pre-Planning" },
    { key: "sectionB_MobilizationToDemobilization", title: "Section B – Mobilization to Demobilization" },
    { key: "sectionC_SupportCraft", title: "Section C – Support Craft" },
    { key: "sectionD_STSEquipment", title: "Section D – STS Equipment" },
    { key: "sectionE_PostOperation", title: "Section E – Post Operation" },
  ];

  const children = [
    headerTable,
    new Paragraph({ spacing: { before: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: "BASIC INFORMATION", bold: true, size: 24 })],
    }),
    basicInfoTable,
  ];

  sectionTitles.forEach(({ key, title }) => {
    const sectionData = report[key];
    if (sectionData && Array.isArray(sectionData) && sectionData.length > 0) {
      children.push(new Paragraph({ spacing: { before: 300 } }));
      children.push(
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 22 })],
        })
      );
      const sectionTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              tableCell("Q No", true),
              tableCell("Question", true),
              tableCell("Answer", true),
              tableCell("Remarks", true),
            ],
          }),
          ...sectionData.map((q) =>
            new TableRow({
              children: [
                tableCell(q.qNo || ""),
                tableCell(q.question || ""),
                tableCell(q.answer || ""),
                tableCell(q.remarks || ""),
              ],
            })
          ),
        ],
      });
      children.push(sectionTable);
    }
  });

  if (report.comments?.remarks) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "COMMENTS", bold: true, size: 22 })],
      })
    );
    children.push(
      new Paragraph({
        children: [new TextRun(report.comments.remarks)],
      })
    );
  }

  /* ================= COMPLETED BY & SIGNATURE ================= */
  const completedBy = report.completedBy;
  if (completedBy?.name || completedBy?.date || completedBy?.signatureText || completedBy?.signaturePhoto || completedBy?.signatureUrl) {
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "COMPLETED BY", bold: true, size: 22 })],
      })
    );
    const completedRows = [
      ["Name", completedBy?.name || ""],
      ["Date", formatDate(completedBy?.date)],
    ];
    if (completedBy?.signatureText) {
      completedRows.push(["Signature (text)", completedBy.signatureText]);
    }
    const completedTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: completedRows.map(([label, value]) =>
        new TableRow({
          children: [
            tableCell(label, true),
            tableCell(value || "________________________"),
          ],
        })
      ),
    });
    children.push(completedTable);

    let signatureImageBuffer = null;
    if (completedBy?.signaturePhoto && typeof completedBy.signaturePhoto === "string" && completedBy.signaturePhoto.startsWith("data:")) {
      const match = completedBy.signaturePhoto.match(/^data:([^;]+);base64,(.+)$/s);
      if (match && match[2]) {
        try {
          signatureImageBuffer = Buffer.from(match[2], "base64");
        } catch (_) {}
      }
    } else if (completedBy?.signatureUrl && typeof completedBy.signatureUrl === "string") {
      try {
        const sigPath = completedBy.signatureUrl.startsWith("/")
          ? path.join(process.cwd(), "public", completedBy.signatureUrl.slice(1))
          : path.join(process.cwd(), completedBy.signatureUrl);
        if (fs.existsSync(sigPath)) {
          signatureImageBuffer = fs.readFileSync(sigPath);
        }
      } catch (_) {}
    }
    if (signatureImageBuffer && signatureImageBuffer.length > 0) {
      children.push(new Paragraph({ spacing: { before: 200 } }));
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: "Signature: ", bold: true }),
          ],
        })
      );
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new ImageRun({
              data: signatureImageBuffer,
              transformation: { width: 180, height: 60 },
            }),
          ],
        })
      );
    }
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
        children: [
          new TextRun({
            text: textValue,
            bold,
          }),
        ],
      }),
    ],
  });
}

function formatDate(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return "";
  }
}
