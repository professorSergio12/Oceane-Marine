/**
 * Equipment picker helpers for the STS operation forms (create + edit).
 * Each option shows Equipment Code, Equipment Type and Last Test Date from PMS.
 */

export function formatEquipmentTestDate(d) {
  if (!d) return "Not tested";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "Not tested";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Free to pick: not locked by another operation and still active in PMS. */
export function isEquipmentAvailable(e) {
  return !e?.isInUse && (e?.status || "ACTIVE") === "ACTIVE";
}

/** PMS equipment record → dropdown option. */
export function toEquipmentOption(e) {
  return {
    value: e._id,
    label: e.equipmentName || "Equipment",
    code: e.equipmentCode || "",
    type: e.equipmentType || "",
    lastTest: e.lastTestDisplayDate ?? e.lastTestDate ?? null,
  };
}

/** Text on the dropdown button; the selected items themselves are listed above it. */
export function equipmentButtonLabel(selectedCount, loading) {
  if (selectedCount > 0) {
    return `${selectedCount} equipment selected — click to add or change`;
  }
  return loading ? "Loading..." : "Select equipment";
}

/** Name on the first line; Code · Type · Last test underneath. */
export function EquipmentOptionLabel({ option }) {
  return (
    <span className="min-w-0">
      <span className="block font-medium text-white">{option.label}</span>
      <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
        <span>
          Code: <span className="text-white/85">{option.code || "—"}</span>
        </span>
        <span>
          Type: <span className="text-white/85">{option.type || "—"}</span>
        </span>
        <span>
          Last Test Date:{" "}
          <span className={option.lastTest ? "text-white/85" : "text-amber-300/90"}>
            {formatEquipmentTestDate(option.lastTest)}
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Selected equipment, one row each, shown ABOVE the dropdown button so it stays
 * visible while the list is open. Each row can be removed with ✕.
 */
export function SelectedEquipmentList({ options, selected, onRemove }) {
  const rows = selected
    .map((val) => options.find((opt) => String(opt.value) === String(val)))
    .filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {rows.map((opt) => (
        <li
          key={String(opt.value)}
          className="flex items-start justify-between gap-3 rounded-xl border border-orange-400/25 bg-orange-500/[0.07] px-3 py-2 text-sm"
        >
          <span className="flex min-w-0 items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <EquipmentOptionLabel option={opt} />
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(opt.value)}
              className="shrink-0 rounded-md px-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              title={`Remove ${opt.label}`}
              aria-label={`Remove ${opt.label}`}
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
