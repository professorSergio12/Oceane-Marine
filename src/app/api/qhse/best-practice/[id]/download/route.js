import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
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
  BorderStyle,
  ImageRun,
} from "docx";
import { connectDB } from "@/lib/config/connection";
import BestPractice from "@/lib/mongodb/models/qhse-best-practices/BestPractice";
import { getQhseFormCode } from "@/lib/constants/qhse-form-codes";

const REV_NO = "1.0";
const APPROVED_BY = "JS";

function formatDate(date) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function makeBorder() {
  return {
    style: BorderStyle.SINGLE,
    size: 8,
    color: "000000",
  };
}

function detailRow(label, value) {
  const text = value !== null && value !== undefined && value !== "" ? String(value) : "—";
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 120, right: 60 },
        borders: {
          top: makeBorder(),
          bottom: makeBorder(),
          left: makeBorder(),
          right: makeBorder(),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, size: 22 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 60, right: 120 },
        borders: {
          top: makeBorder(),
          bottom: makeBorder(),
          left: makeBorder(),
          right: makeBorder(),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text, size: 22 })],
          }),
        ],
      }),
    ],
  });
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const practice = await BestPractice.findById(id).lean();
    if (!practice) {
      return NextResponse.json(
        { error: "Best practice not found" },
        { status: 404 }
      );
    }

    let logoImage = null;
    try {
      logoImage = fs.readFileSync(
        path.join(process.cwd(), "public/image/image.png")
      );
    } catch (err) {
      try {
        logoImage = fs.readFileSync(
          path.join(process.cwd(), "public/image/oceane-marine-docs.png")
        );
      } catch (e) {
        console.error("Logo not found:", e.message);
      }
    }

    const formCode = practice.formCode || getQhseFormCode("BEST_PRACTICE") || "QAF-BP";
    const revDate = formatDate(practice.eventDate || practice.createdAt);

    const formDetailsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: makeBorder(),
        bottom: makeBorder(),
        left: makeBorder(),
        right: makeBorder(),
        insideHorizontal: makeBorder(),
        insideVertical: makeBorder(),
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 60, right: 24 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Form No:", size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 24, right: 60 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: formCode, size: 20 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 60, right: 24 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Rev. No.:", size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 24, right: 60 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: REV_NO, size: 18 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 60, right: 24 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Rev Date:", size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 24, right: 60 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: revDate, size: 20 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 60, right: 24 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Approved by:", size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 24, right: 60 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: APPROVED_BY, size: 18 })],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 60, right: 24 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Page:", size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 24, bottom: 24, left: 24, right: 60 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "1 of 1", size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: makeBorder(),
        bottom: makeBorder(),
        left: makeBorder(),
        right: makeBorder(),
        insideHorizontal: makeBorder(),
        insideVertical: makeBorder(),
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 48, bottom: 48, left: 80, right: 40 },
              children: [
                logoImage
                  ? new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new ImageRun({
                          data: logoImage,
                          transformation: { width: 120, height: 52 },
                        }),
                      ],
                    })
                  : new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "OCEANE GROUP SHIP-TO-SHIP TRANSFER",
                          bold: true,
                          size: 14,
                        }),
                      ],
                    }),
              ],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 48, bottom: 48, left: 40, right: 40 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "BEST PRACTICES",
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [formDetailsTable],
            }),
          ],
        }),
      ],
    });

    const recordDetailsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: makeBorder(),
        bottom: makeBorder(),
        left: makeBorder(),
        right: makeBorder(),
        insideHorizontal: makeBorder(),
        insideVertical: makeBorder(),
      },
      rows: [
        detailRow("Form Code:", formCode || "—"),
        detailRow("Serial:", practice.serialNumber),
        detailRow("Event Date:", formatDate(practice.eventDate)),
        detailRow("Description:", practice.description),
        detailRow("Created At:", formatDate(practice.createdAt)),
      ],
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: [
            headerTable,
            new Paragraph({ spacing: { before: 400, after: 200 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: "Record Details",
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            recordDetailsTable,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `Best-Practice-${(practice.serialNumber || id).replace(/[^a-zA-Z0-9-]/g, "-")}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Best practice download error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
