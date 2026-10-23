import Compatibility from "@/lib/mongodb/models/operations/Compatibility";

/**
 * Hose and fender compatibility for the same operation belong in ONE record.
 * New saves merge into the existing record (see create route); records saved separately
 * before this change are combined when read, so no data is deleted or rewritten.
 *
 * Ship fields used by each calculation (see compatibility/calculations.js):
 */
export const HOSE_SHIP_FIELDS = ["MaxFreeboard", "MinFreeboard", "ManifoldToRail"];
export const FENDER_SHIP_FIELDS = ["DWT", "Beam", "DISP", "Draft"];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Same operation = same operation number (trimmed, case-insensitive). */
export function compatibilityKey(rec) {
  return String(rec?.operationNumber ?? "").trim().toUpperCase();
}

export const hasHoseResult = (rec) => {
  const h = rec?.results?.hose;
  return Boolean(h && (h.HoseCal != null || h.FreeboardDiff != null));
};

export const hasFenderResult = (rec) => {
  const f = rec?.results?.fender;
  return Boolean(f && (f.EDC != null || f.Fenderselect_Calm));
};

const byNewest = (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);

function pickFields(ship, fields) {
  const out = {};
  for (const f of fields) if (ship?.[f] != null) out[f] = ship[f];
  return out;
}

/**
 * Combine the records of one operation into a single view. The newest record is the primary
 * (its _id is used for view/edit/download); each section's ship values and results come from
 * the newest record that calculated that section.
 */
export function mergeCompatibilityRecords(records) {
  const sorted = [...records].sort(byNewest);
  const primary = sorted[0];
  const hoseSource = sorted.find(hasHoseResult);
  const fenderSource = sorted.find(hasFenderResult);

  const ship = (side) => ({
    ...(primary[side] || {}),
    name: primary[side]?.name || sorted.map((r) => r[side]?.name).find(Boolean) || "",
    ...(hoseSource ? pickFields(hoseSource[side], HOSE_SHIP_FIELDS) : {}),
    ...(fenderSource ? pickFields(fenderSource[side], FENDER_SHIP_FIELDS) : {}),
  });

  const results = {};
  if (hoseSource) results.hose = hoseSource.results.hose;
  if (fenderSource) results.fender = fenderSource.results.fender;

  return {
    ...primary,
    STBL: ship("STBL"),
    SS: ship("SS"),
    results,
    location: primary.location?.name ? primary.location : sorted.map((r) => r.location).find((l) => l?.name) || primary.location,
    groupIds: sorted.map((r) => String(r._id)),
  };
}

/** All records of the same operation as `operationNumber` (oldest duplicates included). */
export async function findCompatibilityGroup(operationNumber) {
  const key = String(operationNumber ?? "").trim();
  if (!key) return [];
  return Compatibility.find({
    operationNumber: { $regex: `^\\s*${escapeRegex(key)}\\s*$`, $options: "i" },
  }).lean();
}

/** Load a record by id and return the combined hose + fender view of its operation. */
export async function loadMergedCompatibility(id) {
  const doc = await Compatibility.findById(id).lean();
  if (!doc) return null;
  const group = await findCompatibilityGroup(doc.operationNumber);
  if (group.length <= 1) return { ...doc, groupIds: [String(doc._id)] };
  const merged = mergeCompatibilityRecords(group);
  // Keep the requested id as the handle so links stay stable
  return { ...merged, _id: doc._id };
}

/** Group a list of records by operation → one combined entry each. */
export function groupCompatibilityList(records) {
  const groups = new Map();
  for (const rec of records) {
    const key = compatibilityKey(rec) || `id:${rec._id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }
  return [...groups.values()].map((g) => (g.length === 1 ? { ...g[0], groupIds: [String(g[0]._id)] } : mergeCompatibilityRecords(g)));
}
