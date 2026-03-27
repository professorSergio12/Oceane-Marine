/**
 * Resolve file URL/path for a linked checklist row from STS operation.documents.
 * Prefers entry tied to the specific checklist Mongo _id, else latest uploadedAt for that documentType.
 *
 * @param {Array<{ documentType?: string, filePath?: string, checklistId?: import("mongoose").Types.ObjectId | string, uploadedAt?: Date | string }>|undefined} documents
 * @param {string} formCode
 * @param {string|import("mongoose").Types.ObjectId|undefined|null} checklistDocId - latest linked checklist _id from linked-forms API
 * @returns {string|null}
 */
export function resolveLinkedFormFilePath(documents, formCode, checklistDocId) {
  if (!documents?.length || !formCode) return null;
  const list = documents.filter((d) => d?.filePath && d.documentType === formCode);
  if (!list.length) return null;
  const sid = checklistDocId != null ? String(checklistDocId) : null;
  if (sid) {
    const byChecklist = list.find(
      (d) => d.checklistId != null && String(d.checklistId) === sid
    );
    if (byChecklist) return byChecklist.filePath;
  }
  const sorted = [...list].sort(
    (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
  );
  return sorted[0].filePath;
}
