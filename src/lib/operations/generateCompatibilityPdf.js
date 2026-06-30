import { fillCompatibilityDocx } from "@/lib/operations/fillCompatibilityDocx";
import { convertDocxBufferToPdf } from "@/lib/operations/convertDocxToPdf";

/**
 * Generate Compatibility PDF the same way as Word: fill Compatibility.template.docx
 * with record values, then convert to PDF via LibreOffice.
 * @param {object} doc - Compatibility lean document from MongoDB
 * @returns {Promise<Buffer>}
 */
export async function generateCompatibilityPdf(doc) {
  const docxBuffer = await fillCompatibilityDocx(doc);
  return convertDocxBufferToPdf(docxBuffer);
}
