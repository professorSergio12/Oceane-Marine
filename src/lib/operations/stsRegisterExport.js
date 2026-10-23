import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import StsOperation from "@/lib/mongodb/models/sts-documentation/StsOperation";
import "@/lib/mongodb/models/Location";
import "@/lib/mongodb/models/MooringMaster";
import "@/lib/mongodb/models/CargoType";
import "@/lib/mongodb/models/pms/Equipment";
import STSChecklistOne from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-001";
import STSChecklistTwo from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-002";
import STSChecklist3A3B from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-003";
import STSChecklist4AF from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-004";
import STSChecklist5 from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-005";
import STSStandingOrder from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-011";
import STSEquipmentChecklist from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-014";
import STSHourlyQuantityLog from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-015";
import STSTimesheet from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-018";
import MasterFeedbackForm from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-020";
import RecordOfWorkHours from "@/lib/mongodb/models/operation-sts-checklist/OPS-OFD-023";

/**
 * Full STS operations register, in the Excel's own 31-column layout:
 *   1. every row of the customer's historical Excel, exactly as it is (duplicates included), then
 *   2. every operation in the app, appended below — even when its ref also appears in the old data.
 * The template file itself is never modified.
 */
export const REGISTER_TEMPLATE_PATH = path.join(
  process.cwd(),
  "public/templates/back-data/Oceane Group Database.xlsx"
);

const HEADER_ROW = 1;
const COL = { REF: 1, TYPE: 2, STATUS: 3, LOCATION: 4, DATE: 5, STBL: 6, SS: 7, MOORING_MASTER: 8, CARGO: 9, QUANTITY: 10, EQUIP: 30, REMARKS: 31 };
const LAST_COL = 31;

const STATUS_LABELS = {
  INPROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELED: "Cancelled",
  "Lined Up": "Lined up",
};
const TYPE_LABELS = { "Ship to Ship": "STS OPS" };

/**
 * Document columns 11–29. "Yes" when the PDF was uploaded on the operation (field)
 * or the linked app checklist exists (form → generated document).
 */
const DOCUMENT_COLUMNS = [
  { col: 11, field: "jpo" },
  { col: 12, field: "chsSSQ" },
  { col: 13, field: "msSSQ" },
  { col: 14, field: "chsIndemnity" },
  { col: 15, field: "msIndemnity" },
  { col: 16, field: "standingOrder", form: "OPS-OFD-011" },
  { col: 17, field: "checklist1", form: "OPS-OFD-001" },
  { col: 18, field: "checklist2", form: "OPS-OFD-002" },
  { col: 19, field: "checklist3AB", form: "OPS-OFD-003" },
  { col: 20, field: "checklist4AF", form: "OPS-OFD-004" },
  { col: 21, field: "checklist5AC", form: "OPS-OFD-005" },
  { col: 22, field: "stsTimesheet", form: "OPS-OFD-018" },
  { col: 23, field: "hourlyChecks", form: "OPS-OFD-015" },
  { col: 24, field: "incidentReporting" },
  { col: 25, field: "chsFeedback", form: "OPS-OFD-020-CHS" },
  { col: 26, field: "msFeedback", form: "OPS-OFD-020-MS" },
  { col: 27, field: "restHoursCKL", form: "OPS-OFD-023" },
  { col: 28, field: "stsEquipChecklistPriorOps", form: "OPS-OFD-014-B" },
  { col: 29, field: "stsEquipChecklistAfterOps", form: "OPS-OFD-014-A" },
];

const SIMPLE_FORMS = [
  ["OPS-OFD-001", STSChecklistOne],
  ["OPS-OFD-002", STSChecklistTwo],
  ["OPS-OFD-003", STSChecklist3A3B],
  ["OPS-OFD-004", STSChecklist4AF],
  ["OPS-OFD-005", STSChecklist5],
  ["OPS-OFD-011", STSStandingOrder],
  ["OPS-OFD-015", STSHourlyQuantityLog],
  ["OPS-OFD-018", STSTimesheet],
  ["OPS-OFD-023", RecordOfWorkHours],
];

const norm = (s) => String(s ?? "").trim().toLowerCase();
const hasText = (v) => typeof v === "string" && v.trim() !== "";

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object" && !(value instanceof Date)) {
    if (value.richText) return value.richText.map((t) => t.text).join("");
    return String(value.text ?? value.result ?? "");
  }
  return String(value);
}

/** Calendar date of the operation in UAE time, as a UTC-midnight Date (how Excel dates are stored). */
function toExcelDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return new Date(`${ymd}T00:00:00Z`);
}

/** refs → Set of form codes that have at least one checklist record in the app. */
async function loadFilledForms(operations) {
  const refs = operations.map((op) => op.Operation_Ref_No).filter(Boolean);
  const filled = new Map(refs.map((r) => [r, new Set()]));
  if (refs.length === 0) return filled;
  const mark = (ref, code) => filled.get(ref)?.add(code);

  await Promise.all([
    ...SIMPLE_FORMS.map(async ([code, model]) => {
      const docs = await model.find({ operationRef: { $in: refs } }).select("operationRef").lean();
      docs.forEach((d) => mark(d.operationRef, code));
    }),
    (async () => {
      const docs = await STSEquipmentChecklist.find({ operationRef: { $in: refs } })
        .select("operationRef jobInfo.operationPhase")
        .lean();
      docs.forEach((d) => {
        const phase = d.jobInfo?.operationPhase;
        if (phase === "BEFORE_OPERATION") mark(d.operationRef, "OPS-OFD-014-B");
        if (phase === "AFTER_OPERATION") mark(d.operationRef, "OPS-OFD-014-A");
      });
    })(),
    (async () => {
      // Master's feedback is split CHS / MS by vessel name (same rule as linked-forms API)
      const byRef = new Map(operations.map((op) => [op.Operation_Ref_No, op]));
      const docs = await MasterFeedbackForm.find({ operationRef: { $in: refs } })
        .select("operationRef jobDetails.vesselName")
        .lean();
      docs.forEach((d) => {
        const op = byRef.get(d.operationRef);
        const vessel = norm(d.jobDetails?.vesselName);
        if (!op || !vessel) return;
        if (vessel === norm(op.chs)) mark(d.operationRef, "OPS-OFD-020-CHS");
        else if (vessel === norm(op.ms)) mark(d.operationRef, "OPS-OFD-020-MS");
      });
    })(),
  ]);

  return filled;
}

/** Values for the 31 Excel columns for one app operation. */
function buildAppRowValues(op, filledForms) {
  const values = {
    [COL.REF]: op.Operation_Ref_No || "",
    [COL.TYPE]: TYPE_LABELS[op.typeOfOperation] || op.typeOfOperation || "",
    [COL.STATUS]: STATUS_LABELS[op.operationStatus] || op.operationStatus || "",
    [COL.LOCATION]: op.location?.name || "",
    [COL.DATE]: toExcelDate(op.operationStartTime),
    [COL.STBL]: op.chs || "",
    [COL.SS]: op.ms || "",
    [COL.MOORING_MASTER]: op.mooringMaster?.name || "",
    [COL.CARGO]: op.typeOfCargo?.type || "",
    [COL.QUANTITY]: op.quantity != null && !Number.isNaN(Number(op.quantity)) ? Number(op.quantity) : "",
    [COL.EQUIP]: (op.equipments || [])
      .map((e) => e?.equipment?.equipmentCode)
      .filter(Boolean)
      .join(", "),
    [COL.REMARKS]: op.remarks || "",
  };
  const forms = filledForms.get(op.Operation_Ref_No) || new Set();
  for (const { col, field, form } of DOCUMENT_COLUMNS) {
    values[col] = hasText(op[field]) || (form && forms.has(form)) ? "Yes" : "No";
  }
  return values;
}

function copyRowStyle(fromRow, toRow) {
  for (let c = 1; c <= LAST_COL; c++) {
    const style = fromRow.getCell(c).style;
    if (style) toRow.getCell(c).style = JSON.parse(JSON.stringify(style));
  }
  if (fromRow.height) toRow.height = fromRow.height;
}

/**
 * Build the register workbook: old Excel rows first, then all app operations.
 * @returns {Promise<{ buffer: Buffer, stats: { excelRows: number, added: number } }>}
 */
export async function buildStsRegisterWorkbook() {
  await fs.access(REGISTER_TEMPLATE_PATH);

  const operations = await StsOperation.find({ isLatest: true })
    .populate("location", "name")
    .populate("mooringMaster", "name")
    .populate("typeOfCargo", "type")
    .populate("equipments.equipment", "equipmentCode")
    .sort({ operationStartTime: 1, Operation_Ref_No: 1 })
    .lean();

  const filledForms = await loadFilledForms(operations);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(REGISTER_TEMPLATE_PATH);
  const sheet = workbook.worksheets[0];

  // Old data stays untouched; app rows start right after the last used row
  let lastDataRow = HEADER_ROW;
  sheet.eachRow({ includeEmpty: false }, (_row, rowNumber) => {
    if (rowNumber > HEADER_ROW) lastDataRow = rowNumber;
  });
  const excelRows = lastDataRow - HEADER_ROW;
  const styleSource = sheet.getRow(lastDataRow > HEADER_ROW ? lastDataRow : HEADER_ROW + 1);

  let added = 0;
  for (const op of operations) {
    const values = buildAppRowValues(op, filledForms);
    lastDataRow += 1;
    const row = sheet.getRow(lastDataRow);
    copyRowStyle(styleSource, row);
    for (let c = 1; c <= LAST_COL; c++) row.getCell(c).value = values[c] ?? "";
    row.commit();
    added += 1;
  }

  // Keep the date column formatted like the original sheet
  sheet.getColumn(COL.DATE).numFmt = sheet.getColumn(COL.DATE).numFmt || "dd-mmm-yy";
  sheet.views = [{ state: "frozen", ySplit: HEADER_ROW }];
  sheet.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: LAST_COL } };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { buffer, stats: { excelRows, added } };
}

/**
 * Rows of the historical Excel register (jobs before the app), parsed once and cached per
 * file modification time. Each row: { ref, type, status, location, date, stbl, ss, mooringMaster,
 * cargo, quantityMT, equipmentUsed }. Returns [] if the file is missing.
 */
let registerCache = { mtimeMs: 0, rows: null };
export async function getRegisterRows() {
  try {
    const stat = await fs.stat(REGISTER_TEMPLATE_PATH);
    if (registerCache.rows && registerCache.mtimeMs === stat.mtimeMs) return registerCache.rows;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(REGISTER_TEMPLATE_PATH);
    const rows = [];
    workbook.worksheets[0].eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= HEADER_ROW) return;
      const text = (col) => cellText(row.getCell(col).value).trim();
      const dateValue = row.getCell(COL.DATE).value;
      const qty = row.getCell(COL.QUANTITY).value;
      const quantityMT = typeof qty === "number" ? qty : Number(String(cellText(qty)).replace(/,/g, ""));
      rows.push({
        ref: text(COL.REF),
        type: text(COL.TYPE),
        status: text(COL.STATUS),
        location: text(COL.LOCATION),
        date: dateValue instanceof Date ? dateValue : null,
        stbl: text(COL.STBL),
        ss: text(COL.SS),
        mooringMaster: text(COL.MOORING_MASTER),
        cargo: text(COL.CARGO),
        quantityMT: Number.isFinite(quantityMT) && cellText(qty).trim() !== "" ? quantityMT : null,
        equipmentUsed: text(COL.EQUIP),
      });
    });
    registerCache = { mtimeMs: stat.mtimeMs, rows };
    return rows;
  } catch {
    return [];
  }
}

/**
 * Highest sequence number used for a year in the historical Excel (e.g. 540 for "2026-540").
 */
export async function getRegisterMaxSeqByYear() {
  const maxByYear = {};
  for (const { ref } of await getRegisterRows()) {
    const m = /^(\d{4})-(\d+)/.exec(ref);
    if (m) maxByYear[m[1]] = Math.max(maxByYear[m[1]] || 0, Number(m[2]));
  }
  return maxByYear;
}
