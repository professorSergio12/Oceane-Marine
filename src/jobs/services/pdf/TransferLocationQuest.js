import fs from "fs";
import path from "path";
import { createQhsePdfHeaderController } from "./shared/qhseRepeatingHeaderPdf.js";
import { pdfSafeText } from "./shared/pdfSafeText.js";
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
    ImageRun
} from "docx";

const PDF_FORM_CODE_DEFAULT = "QAF-OFD-049";
const PDF_FORM_TITLE = "TRANSFER LOCATION QUESTIONNAIRE";

export async function generateTransferLocationQuestDoc(quest, fullPath) {
    /* ================= LOAD IMAGES ================= */
    let logoImage = null;
    try {
        logoImage = fs.readFileSync(
            path.join(process.cwd(), "public/image/oceane-marine-docs.png")
        );
    } catch { }

    /* ================= HEADER TABLE ================= */
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    /* LOGO CELL */
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
                                            transformation: { width: 120, height: 60 }
                                        })
                                    ]
                                })
                                : new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [new TextRun("OCEANE")]
                                })
                        ]
                    }),
                    /* TITLE CELL */
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: "TRANSFER LOCATION QUESTIONNAIRE",
                                        bold: true,
                                        size: 28
                                    })
                                ]
                            })
                        ]
                    }),
                    /* DOC INFO CELL */
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [
                            infoLine("Form Number", quest.formCode || "QAF-OFD-049"),
                            infoLine("Serial Number", quest.serialNumber || ""),
                            infoLine("Version", quest.version || ""),
                            infoLine("Date", formatDate(quest.date || quest.createdAt))
                        ]
                    })
                ]
            })
        ]
    });

    /* ================= BASIC INFORMATION TABLE ================= */
    const basicInfoRows = [
        ["Location Name", quest.locationName || ""],
        ["Uploaded By", quest.uploadedBy?.name || ""],
        ["Upload Date", formatDate(quest.uploadedAt || quest.createdAt)]
    ];

    const basicInfoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: basicInfoRows.map(([label, value]) =>
            new TableRow({
                children: [
                    tableCell(label, true),
                    tableCell(value || "________________________")
                ]
            })
        )
    });

    /* ================= DOC ================= */
    const children = [
        headerTable,
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({
            children: [new TextRun({ text: "BASIC INFORMATION", bold: true, size: 24 })]
        }),
        basicInfoTable
    ];

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 500,
                            right: 600,
                            bottom: 500,
                            left: 600
                        }
                    }
                },
                children
            }
        ]
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(fullPath, buffer);
}

/**
 * PDF export: same fields as Word + repeating QHSE header.
 * Dynamic text uses {@link pdfSafeText} for jsPDF Helvetica compatibility.
 *
 * @param {object} quest – lean STSTransferLocationQuest document
 * @returns {Promise<Buffer>}
 */
export async function generateTransferLocationQuestPdf(quest) {
    const jspdfModule = await import("jspdf");
    const JsPDF =
        jspdfModule.jsPDF ??
        (typeof jspdfModule.default === "function" ? jspdfModule.default : null);
    if (!JsPDF) {
        throw new Error("jsPDF constructor not found");
    }
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new JsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const reportDate = quest.date || quest.createdAt;
    const headerCtl = createQhsePdfHeaderController({
        formTitle: PDF_FORM_TITLE,
        metaPairs: [
            ["Form Number", quest.formCode || PDF_FORM_CODE_DEFAULT],
            ["Serial Number", quest.serialNumber || ""],
            ["Version", String(quest.version || "")],
            ["Date", formatDate(reportDate)],
        ],
    });
    const tableMargins = headerCtl.getAutoTableMargins();
    const m = headerCtl.sideMarginMm;

    const gridStyles = {
        fontSize: 9,
        cellPadding: 3,
        textColor: [30, 30, 30],
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
        overflow: "linebreak",
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BASIC INFORMATION", m, headerCtl.tableTopMm - 5);

    const uploadDateStr =
        formatDate(quest.uploadedAt || quest.createdAt) || "________________________";

    const basicBody = [
        [
            "Location Name",
            pdfSafeText(quest.locationName) || "________________________",
        ],
        [
            "Uploaded By",
            pdfSafeText(quest.uploadedBy?.name) || "________________________",
        ],
        ["Upload Date", pdfSafeText(uploadDateStr) || "________________________"],
    ];

    autoTable(doc, {
        startY: headerCtl.tableTopMm + 5,
        margin: tableMargins,
        willDrawPage: headerCtl.willDrawPage,
        head: [],
        body: basicBody,
        theme: "grid",
        styles: gridStyles,
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 48 },
            1: { cellWidth: "auto" },
        },
    });

    return Buffer.from(doc.output("arraybuffer"));
}

/* HELPERS */
function infoLine(label, value) {
    return new Paragraph({
        children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun(value || "")
        ]
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
                        bold
                    })
                ]
            })
        ]
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
            year: "numeric"
        });
    } catch (e) {
        return "";
    }
}
