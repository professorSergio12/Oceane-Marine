import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

/**
 * OPS-OFD-018 STS Timesheet — filled into the client's own Word template so the
 * generated file keeps the exact layout (header, logo, borders, fonts, page numbers).
 *
 * The template's value cells contain legacy FORMTEXT form fields; each one we fill is
 * replaced by plain text using that cell's own paragraph/run formatting.
 */
export const OPS_OFD_018_TEMPLATE = path.join(
  process.cwd(),
  "public/templates/OPS-OFD-018  - Timesheet.docx"
);

// Body tables in template order
const T = { HEAD: 0, VESSELS: 1, TIMINGS: 2, ADDITIONAL: 3, WEATHER_CARGO: 4, REMARKS: 5 };
const TIMING_FIRST_ROW = 2; // rows 0–1 are the two header rows
const ADDITIONAL_FIRST_ROW = 2;
const REMARKS_FIRST_ROW = 1;

/* ------------------------------ formatting ------------------------------ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Template date fields use dd-MMM-yyyy, e.g. 28-Aug-2026 (calendar date in UAE time). */
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .split("-");
  return `${day}-${MONTHS[Number(m) - 1]}-${y}`;
}

const str = (v) => (v == null ? "" : String(v).trim());
const normalizeName = (s) => str(s).toUpperCase().replace(/[^A-Z0-9]/g, "");

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ------------------------------ XML helpers ------------------------------ */

const rowsOf = (tableXml) => tableXml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
const cellsOf = (rowXml) => rowXml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];

function replaceAt(source, oldPart, newPart, fromIndex = 0) {
  const at = source.indexOf(oldPart, fromIndex);
  if (at === -1) return source;
  return source.slice(0, at) + newPart + source.slice(at + oldPart.length);
}

/** Text runs for a value (line breaks kept), using the given run properties. */
function textRuns(text, rPr) {
  if (!str(text)) return "";
  return str(text)
    .split(/\r?\n/)
    .map(
      (line, i) =>
        `<w:r>${rPr}${i > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`
    )
    .join("");
}

/** One legacy FORMTEXT field: from the run holding fldChar "begin" to the run holding fldChar "end". */
const FORM_FIELD = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?w:fldCharType="begin"[\s\S]*?w:fldCharType="end"\/><\/w:r>/;

/**
 * Put `text` into a cell. If the cell holds a form field, only the field is replaced, so any
 * label in the same cell (e.g. "SEA: [field]") stays. Otherwise the cell's paragraph content
 * is replaced, keeping the cell and paragraph properties (alignment, spacing, font size).
 */
function setCellText(cellXml, text) {
  const field = FORM_FIELD.exec(cellXml);
  if (field && field[0].includes("FORMTEXT")) {
    const rPr = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(field[0])?.[0] || "";
    return cellXml.replace(field[0], textRuns(text, rPr));
  }

  const tcPr = /<w:tcPr>[\s\S]*?<\/w:tcPr>/.exec(cellXml)?.[0] || "";
  const pOpen = /<w:p(?:\s[^>]*)?>/.exec(cellXml)?.[0] || "<w:p>";
  const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(cellXml)?.[0] || "";
  const rPr = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(pPr)?.[0] || "";
  return `<w:tc>${tcPr}${pOpen}${pPr}${textRuns(text, rPr)}</w:p></w:tc>`;
}

/** Set several cells of a row: { cellIndex: text }. */
function setRowCells(rowXml, values) {
  let out = rowXml;
  let searchFrom = 0;
  cellsOf(rowXml).forEach((cell, index) => {
    const at = out.indexOf(cell, searchFrom);
    if (!(index in values)) {
      searchFrom = at + cell.length;
      return;
    }
    const filled = setCellText(cell, values[index]);
    out = out.slice(0, at) + filled + out.slice(at + cell.length);
    searchFrom = at + filled.length;
  });
  return out;
}

/** Fill rows of a table starting at `firstRow`; clones the last template row when more are needed. */
function fillTableRows(tableXml, firstRow, rowValues) {
  const rows = rowsOf(tableXml);
  const templateRows = rows.slice(firstRow);
  if (templateRows.length === 0) return tableXml;

  const filledRows = [];
  const count = Math.max(templateRows.length, rowValues.length);
  for (let i = 0; i < count; i++) {
    const base = templateRows[i] || templateRows[templateRows.length - 1];
    filledRows.push(setRowCells(base, rowValues[i] || {}));
  }

  const start = tableXml.indexOf(templateRows[0]);
  const lastRow = templateRows[templateRows.length - 1];
  const end = tableXml.lastIndexOf(lastRow) + lastRow.length;
  return tableXml.slice(0, start) + filledRows.join("") + tableXml.slice(end);
}

/** Remove any form field we didn't fill (labels in the same cell stay), so no grey boxes remain. */
function clearLeftoverFormFields(tableXml) {
  return tableXml.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (cell) => {
    let out = cell;
    while (out.includes("FORMTEXT")) {
      const next = setCellText(out, "");
      if (next === out) break;
      out = next;
    }
    return out;
  });
}

/* ------------------------------ data mapping ------------------------------ */

const timingCells = (t) => ({
  1: formatDate(t?.fromDate),
  2: str(t?.fromTime),
  3: formatDate(t?.toDate),
  4: str(t?.toTime),
  5: str(t?.remarks),
});

/**
 * Template has 14 named activity rows. App timings are matched by activity name;
 * timings whose name isn't in the template are added as extra rows below.
 */
const hasContent = (t) =>
  Boolean(str(t?.activityName) || t?.fromDate || str(t?.fromTime) || t?.toDate || str(t?.toTime) || str(t?.remarks));

function buildTimingRows(templateNames, operationTimings) {
  const timings = operationTimings || [];
  const used = new Set();
  const rows = templateNames.map((name, index) => {
    let i = timings.findIndex(
      (t, k) => !used.has(k) && normalizeName(t?.activityName) === normalizeName(name)
    );
    // A timing without a name belongs to the template row in the same position
    if (i === -1 && timings[index] && !str(timings[index].activityName) && !used.has(index)) i = index;
    if (i !== -1) used.add(i);
    return { 0: name, ...timingCells(i === -1 ? null : timings[i]) };
  });
  timings
    .filter((t, k) => !used.has(k) && hasContent(t))
    .forEach((t) => rows.push({ 0: str(t.activityName), ...timingCells(t) }));
  return rows;
}

/**
 * Fill the OPS-OFD-018 Word template with a timesheet record and write it to `fullPath`.
 * @param {object} timesheet STSTimesheet document (plain or mongoose)
 * @param {string} fullPath  destination .docx path
 */
export async function fillOpsOfd018Template(timesheet, fullPath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(OPS_OFD_018_TEMPLATE));
  let xml = await zip.file("word/document.xml").async("string");

  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  if (tables.length < 6) {
    throw new Error(`OPS-OFD-018 template layout changed: expected 6 tables, found ${tables.length}`);
  }

  const basic = timesheet.basicInfo || {};
  const weather = timesheet.weatherDelay || {};
  const cargo = timesheet.cargoInfo || {};
  const filled = [...tables];

  // STS superintendent / Job No.
  {
    const [r0] = rowsOf(filled[T.HEAD]);
    filled[T.HEAD] = filled[T.HEAD].replace(
      r0,
      setRowCells(r0, { 1: str(basic.stsSuperintendent), 3: str(basic.jobNumber) })
    );
  }

  // Vessels, support craft, location
  {
    const [r0, r1] = rowsOf(filled[T.VESSELS]);
    let t = filled[T.VESSELS];
    t = t.replace(r0, setRowCells(r0, { 1: str(basic.receivingVessel), 3: str(basic.dischargingVessel) }));
    t = t.replace(r1, setRowCells(r1, { 1: str(basic.supportCraftMobDemob), 3: str(basic.location) }));
    filled[T.VESSELS] = t;
  }

  // STS operation timings (14 named rows + extras)
  {
    const templateNames = rowsOf(filled[T.TIMINGS])
      .slice(TIMING_FIRST_ROW)
      .map((row) =>
        (cellsOf(row)[0].match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
          .map((x) => x.replace(/<[^>]+>/g, ""))
          .join("")
          .trim()
      );
    filled[T.TIMINGS] = fillTableRows(
      filled[T.TIMINGS],
      TIMING_FIRST_ROW,
      buildTimingRows(templateNames, timesheet.operationTimings)
    );
  }

  // Additional activities (4 blank rows, more added if needed)
  {
    const extras = (timesheet.additionalActivities || [])
      .filter(hasContent)
      .map((a) => ({ 0: str(a.activityName), ...timingCells(a) }));
    filled[T.ADDITIONAL] = fillTableRows(filled[T.ADDITIONAL], ADDITIONAL_FIRST_ROW, extras);
  }

  // Significant weather (value goes in the label's own cell: "SEA: <value>") / cargo (col 3).
  // Col 1 is a blank spacer column between the two blocks.
  {
    const rows = rowsOf(filled[T.WEATHER_CARGO]);
    let t = filled[T.WEATHER_CARGO];
    const exposure = weather.totalExposureHours != null && weather.totalExposureHours !== "" ? String(weather.totalExposureHours) : "";
    t = replaceAt(t, rows[1], setRowCells(rows[1], { 0: str(weather.sea), 3: str(cargo.cargoName) }));
    t = replaceAt(t, rows[2], setRowCells(rows[2], { 0: str(weather.swell), 3: str(cargo.cargoQuantity) }));
    t = replaceAt(t, rows[3], setRowCells(rows[3], { 0: str(weather.wind), 3: str(cargo.cargoPumpingTime) }));
    t = replaceAt(t, rows[4], setRowCells(rows[4], { 0: exposure }));
    filled[T.WEATHER_CARGO] = t;
  }

  // Equipment / operational / incident / delays remarks — one line per row (col 1 is the text column)
  {
    const lines = str(timesheet.finalRemarks)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => ({ 1: line }));
    filled[T.REMARKS] = fillTableRows(filled[T.REMARKS], REMARKS_FIRST_ROW, lines);
  }

  // Put tables back in order and drop any unfilled form fields
  let cursor = 0;
  tables.forEach((original, i) => {
    const at = xml.indexOf(original, cursor);
    const next = clearLeftoverFormFields(filled[i]);
    xml = xml.slice(0, at) + next + xml.slice(at + original.length);
    cursor = at + next.length;
  });
  // Form-field bookmarks: drop any start/end left without its partner after the fields were removed
  const startIds = new Set([...xml.matchAll(/<w:bookmarkStart w:id="(\d+)"/g)].map((m) => m[1]));
  const endIds = new Set([...xml.matchAll(/<w:bookmarkEnd w:id="(\d+)"/g)].map((m) => m[1]));
  xml = xml
    .replace(/<w:bookmarkStart w:id="(\d+)"[^>]*\/>/g, (tag, id) => (endIds.has(id) ? tag : ""))
    .replace(/<w:bookmarkEnd w:id="(\d+)"[^>]*\/>/g, (tag, id) => (startIds.has(id) ? tag : ""));

  zip.file("word/document.xml", xml);
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}
