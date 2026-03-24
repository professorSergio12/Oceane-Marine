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
    ImageRun,
} from "docx";

export async function generateDeclarationOfSeaDoc(declaration, fullPath) {
    const checklists = declaration.checklists || [];
    const constantHeadingShipSig = declaration.constantHeadingShip || {};
    const manoeuvringShipSig = declaration.manoeuvringShip || {};

    /* ================= LOAD IMAGES ================= */

    let logoImage = null;
    let constantHeadingShipSignatureImage = null;
    let manoeuvringShipSignatureImage = null;

    try {
        logoImage = fs.readFileSync(
            path.join(process.cwd(), "public/image/pdf_logo.png")
        );
    } catch { }

    // Load signature images
    const loadSignatureImage = (sig, label) => {
        if (!sig?.signature) {
            console.log(`ℹ️ [DOCX] No signature path for ${label}`);
            return null;
        }
        try {
            let imagePath = sig.signature;
            console.log(`📎 [DOCX] Loading signature for ${label}: ${imagePath.substring(0, 80)}...`);

            // Handle base64 data:image strings directly (stored in DB)
            if (imagePath.startsWith("data:image")) {
                const raw = imagePath.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(raw, "base64");
                console.log(`✅ [DOCX] Signature decoded from base64 for ${label} (${buffer.length} bytes)`);
                return buffer;
            }

            // Handle raw base64 (no data: prefix)
            if (imagePath.length > 100 && !imagePath.startsWith("/") && !imagePath.startsWith("http")) {
                const buffer = Buffer.from(imagePath, "base64");
                console.log(`✅ [DOCX] Signature decoded from raw base64 for ${label} (${buffer.length} bytes)`);
                return buffer;
            }

            // Handle full HTTP URLs
            if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
                try {
                    const parsed = new URL(imagePath);
                    imagePath = parsed.pathname;
                } catch { }
            }

            // Handle file path (relative or absolute)
            if (imagePath.startsWith("/") || imagePath.startsWith("signature")) {
                const sigFullPath = path.join(process.cwd(), "public", imagePath);
                if (fs.existsSync(sigFullPath)) {
                    console.log(`✅ [DOCX] Signature image loaded for ${label}: ${sigFullPath}`);
                    return fs.readFileSync(sigFullPath);
                }
                console.warn(`⚠️ [DOCX] Signature file not found for ${label}: ${sigFullPath}`);
            }
        } catch (err) {
            console.error(`Error loading signature image for ${label}:`, err.message);
        }
        return null;
    };

    constantHeadingShipSignatureImage = loadSignatureImage(constantHeadingShipSig, "constantHeadingShip");
    manoeuvringShipSignatureImage = loadSignatureImage(manoeuvringShipSig, "manoeuvringShip");

    /* ================= HEADER TABLE ================= */

    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    /* LOGO CELL */
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [
                            logoImage
                                ? new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: logoImage,
                                            transformation: { width: 200, height: 100 },
                                        }),
                                    ],
                                })
                                : new Paragraph("OCEANE GROUP"),
                        ],
                    }),

                    /* TITLE CELL */
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: "AT SEA SHIP TO SHIP TRANSFER",
                                        bold: true,
                                        size: 28,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: "Declaration Of STS At Sea",
                                        bold: true,
                                        size: 22,
                                    }),
                                ],
                            }),
                        ],
                    }),

                    /* DOC INFO CELL */
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [
                            infoLine("Form No", declaration.formNo || "OPS-OFD-005E"),
                            infoLine("Rev. No.", declaration.revisionNo),
                            infoLine("Issue Date", formatDate(declaration.revisionDate || declaration.issueDate)),
                            infoLine("Approved by", declaration.approvedBy || "JS"),
                            infoLine("Page", declaration.page || "1 of 1"),
                        ],
                    }),
                ],
            }),
        ],
    });

    /* ================= INITIAL INPUT FIELDS ================= */

    const constantHeadingShipName = declaration.constantHeadingShipName || "________________________";
    const manoeuvringShipName = declaration.manoeuvringShipName || "________________________";

    const initialFieldsTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    tableCell("Constant Heading Ship or Berthed Ship:", true),
                    tableCell(constantHeadingShipName),
                ],
            }),
            new TableRow({
                children: [
                    tableCell("Manoeuvring Ship or Outer ship:", true),
                    tableCell(manoeuvringShipName),
                ],
            }),
        ],
    });

    /* ================= DECLARATION SECTION ================= */

    const declarationParagraph = new Paragraph({
        children: [
            new TextRun({
                text: "Declaration for STS operations at Sea",
                bold: true,
                size: 24,
            }),
        ],
    });

    const declarationText = new Paragraph({
        children: [
            new TextRun({
                text: "The undersigned have checked and agreed the applicable checklist questions and confirm in the declarations below.",
            }),
        ],
    });

    /* ================= CHECKLIST TABLE ================= */

    const checklistTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    tableCell("Checklist", true),
                    tableCell("Description", true),
                    tableCell("Constant heading Ship or Berthed ship", true),
                    tableCell("Manoeuvring Ship or Outer ship", true),
                    tableCell("Not Applicable", true),
                ],
            }),
            ...checklists.map((item) => {
                const selection = item.selection || "";
                return new TableRow({
                    children: [
                        tableCell(`Checklist ${item.checklistCode || ""}`),
                        tableCell(item.description || ""),
                        tableCell(selection === "CONSTANT_HEADING" ? "✓" : ""),
                        tableCell(selection === "MANOEUVRING" ? "✓" : ""),
                        tableCell(selection === "NOT_APPLICABLE" ? "✓" : ""),
                    ],
                });
            }),
        ],
    });

    /* ================= CONCLUDING TEXT ================= */

    const concludingText1 = new Paragraph({
        children: [
            new TextRun({
                text: "In Accordance with the Guidance in the STS transfer Guide, The Entries we have made are correct to the best of our knowledge and that the ships agree to perform the STS operation.",
            }),
        ],
    });

    const concludingText2 = new Paragraph({
        children: [
            new TextRun({
                text: `Repetitive Checks noted in Checklist 5B of the transfer Guide, shall be carried out at intervals of not more than ${declaration.repetitiveCheckHours || "...................................."} Hours.`,
            }),
        ],
    });

    const concludingText3 = new Paragraph({
        children: [
            new TextRun({
                text: "If the status of any item changes, the other ship should be notified immediately.",
                bold: true,
            }),
        ],
    });

    /* ================= SIGNATURE TABLE ================= */

    const signatureTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            // Header row
            new TableRow({
                children: [
                    tableCell("Constant Heading Ship or Berthed Ship", true),
                    tableCell("Manoeuvring Ship or Outer ship", true),
                ],
            }),
            // Name row
            new TableRow({
                children: [
                    tableCell(`Name: ${constantHeadingShipSig.name || ""}`),
                    tableCell(`Name: ${manoeuvringShipSig.name || ""}`),
                ],
            }),
            // Rank row
            new TableRow({
                children: [
                    tableCell(`Rank: ${constantHeadingShipSig.rank || ""}`),
                    tableCell(`Rank: ${manoeuvringShipSig.rank || ""}`),
                ],
            }),
            // Signature row
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            constantHeadingShipSignatureImage
                                ? new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: constantHeadingShipSignatureImage,
                                            transformation: { width: 200, height: 100 },
                                        }),
                                    ],
                                })
                                : new Paragraph("Signature"),
                        ],
                    }),
                    new TableCell({
                        children: [
                            manoeuvringShipSignatureImage
                                ? new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: manoeuvringShipSignatureImage,
                                            transformation: { width: 200, height: 100 },
                                        }),
                                    ],
                                })
                                : new Paragraph("Signature"),
                        ],
                    }),
                ],
            }),
            // Date row
            new TableRow({
                children: [
                    tableCell(`Date: ${formatDate(constantHeadingShipSig.date)}`),
                    tableCell(`Date: ${formatDate(manoeuvringShipSig.date)}`),
                ],
            }),
            // Time row
            new TableRow({
                children: [
                    tableCell(`Time: ${constantHeadingShipSig.time || ""}`),
                    tableCell(`Time: ${manoeuvringShipSig.time || ""}`),
                ],
            }),
        ],
    });

    /* ================= DOC ================= */

    const doc = new Document({
        sections: [
            {
                children: [
                    headerTable,
                    new Paragraph(""),
                    initialFieldsTable,
                    new Paragraph(""),
                    declarationParagraph,
                    declarationText,
                    new Paragraph(""),
                    checklistTable,
                    new Paragraph(""),
                    concludingText1,
                    concludingText2,
                    concludingText3,
                    new Paragraph(""),
                    signatureTable,
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(fullPath, buffer);
}

/* HELPERS */
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
