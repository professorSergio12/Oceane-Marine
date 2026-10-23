/** Barrels per metric tonne — same factor used by the operations list and register export. */
export const BARRELS_PER_MT = 7.33;

/**
 * Starting totals provided by the client: as of go-live there were 671 completed operations
 * and 700 million barrels transferred. The dashboard counts from these figures; every
 * operation recorded in the app is added on top. (Not derived from the old Excel.)
 * Override with OPS_BASELINE_COMPLETED / OPS_BASELINE_BARRELS if the client revises them.
 */
function envNumber(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  return raw != null && raw !== "" && Number.isFinite(n) ? n : fallback;
}

export function getHistoricalBaseline() {
  return {
    completedOperations: envNumber("OPS_BASELINE_COMPLETED", 671),
    barrels: envNumber("OPS_BASELINE_BARRELS", 700_000_000),
  };
}

/** Barrels for one operation: quantity is stored in MT. */
export const operationBarrels = (op) => {
  const mt = Number(op?.quantity);
  return Number.isFinite(mt) && mt > 0 ? mt * BARRELS_PER_MT : 0;
};
