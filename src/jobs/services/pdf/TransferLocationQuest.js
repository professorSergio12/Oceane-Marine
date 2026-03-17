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
    ImageRun
} from "docx";

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
