import fs from "fs";
import path from "path";

/** Side margins (mm) */
export const QHSE_PDF_SIDE_MARGIN_MM = 12;

/**
 * Y position where autoTable body continues on new pages (below logo/title/meta).
 * Must clear header art (~12–48 mm); extra room for a one-line section label on page 1 only.
 */
export const QHSE_PDF_TABLE_TOP_MM = 58;

function drawPdfMetaLine(doc, x, y, label, value, maxWidth, lineStepMm = 4.8) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const labelPart = `${label}: `;
  const lw = doc.getTextWidth(labelPart);
  doc.text(labelPart, x, y);
  doc.setFont("helvetica", "normal");
  const restW = Math.max(10, maxWidth - lw);
  const str = String(value ?? "");
  const lines = str.trim() === "" ? [""] : doc.splitTextToSize(str, restW);
  if (lines.length === 0) {
    return y + lineStepMm;
  }
  doc.text(lines[0], x + lw, y);
  let lastBaseline = y;
  for (let i = 1; i < lines.length; i++) {
    lastBaseline += lineStepMm;
    doc.text(lines[i], x, lastBaseline);
  }
  return lastBaseline + lineStepMm + 0.4;
}

/**
 * Draws logo | form title | meta with outer border + column separators (same as Word).
 * @param {*} doc - jsPDF instance
 * @param {{ formTitle: string, metaPairs: [string, string][] }} params
 */
export function paintQhseFormHeader(doc, { formTitle, metaPairs }) {
  const margin = QHSE_PDF_SIDE_MARGIN_MM;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 2 * margin;
  const col1 = contentW * 0.3;
  const col2 = contentW * 0.4;
  const col3 = contentW * 0.3;
  const rowTop = margin;

  let logoBottom = rowTop;
  try {
    const logoPath = path.join(process.cwd(), "public/image/oceane-marine-docs.png");
    const buf = fs.readFileSync(logoPath);
    const logoW = Math.min(48, col1 - 4);
    const logoH = logoW * 0.5;
    doc.addImage(
      buf.toString("base64"),
      "PNG",
      margin + (col1 - logoW) / 2,
      rowTop,
      logoW,
      logoH
    );
    logoBottom = rowTop + logoH;
  } catch {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OCEANE", margin + col1 / 2, rowTop + 8, { align: "center" });
    logoBottom = rowTop + 12;
  }

  const titleX = margin + col1 + col2 / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(formTitle, col2 - 4);
  let titleY = rowTop + 6;
  titleLines.forEach((line) => {
    doc.text(line, titleX, titleY, { align: "center" });
    titleY += 5;
  });
  const titleBottom = titleY;

  const metaX = margin + col1 + col2 + 2;
  const metaMaxW = col3 - 4;
  let metaY = rowTop + 4;
  const metaLineStepMm = 4.8;
  for (const [label, val] of metaPairs) {
    metaY = drawPdfMetaLine(doc, metaX, metaY, label, val, metaMaxW, metaLineStepMm);
  }
  const metaBottom = metaY;

  const headerInnerPaddingBottom = 3;
  const headerBoxTop = rowTop - 2;
  const headerBoxBottom =
    Math.max(logoBottom, titleBottom, metaBottom) + headerInnerPaddingBottom;
  const headerBoxH = headerBoxBottom - headerBoxTop;
  const xLeft = margin;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(xLeft, headerBoxTop, contentW, headerBoxH, "S");
  const sep1 = xLeft + col1;
  const sep2 = xLeft + col1 + col2;
  doc.line(sep1, headerBoxTop, sep1, headerBoxBottom);
  doc.line(sep2, headerBoxTop, sep2, headerBoxBottom);

  return headerBoxBottom;
}

/**
 * Repeats the QHSE header on every physical PDF page (Word-style), without duplicating
 * on the same page when multiple autoTable() runs.
 * @param {{ formTitle: string, metaPairs: [string, string][] }} params
 */
export function createQhsePdfHeaderController(params) {
  let lastPhysicalPage = null;

  function willDrawPage(data) {
    const doc = data.doc;
    const p = doc.getCurrentPageInfo().pageNumber;
    if (lastPhysicalPage === p) return;
    lastPhysicalPage = p;
    paintQhseFormHeader(doc, params);
  }

  /** After doc.addPage() — paint header on the new page and sync dedupe state */
  function notifyManualNewPage(doc) {
    paintQhseFormHeader(doc, params);
    lastPhysicalPage = doc.getCurrentPageInfo().pageNumber;
  }

  function getAutoTableMargins() {
    return {
      top: QHSE_PDF_TABLE_TOP_MM,
      left: QHSE_PDF_SIDE_MARGIN_MM,
      right: QHSE_PDF_SIDE_MARGIN_MM,
      bottom: QHSE_PDF_SIDE_MARGIN_MM,
    };
  }

  return {
    willDrawPage,
    notifyManualNewPage,
    getAutoTableMargins,
    tableTopMm: QHSE_PDF_TABLE_TOP_MM,
    sideMarginMm: QHSE_PDF_SIDE_MARGIN_MM,
  };
}
