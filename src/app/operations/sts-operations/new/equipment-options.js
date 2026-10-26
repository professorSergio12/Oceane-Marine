"use client";

/**
 * Equipment picker helpers for the STS operation forms (create + edit).
 * Each option shows Equipment Code (serial no.), Equipment, Type and Last Test Date from PMS.
 */

import { useState } from "react";

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

/** Serial number (equipment code) on the first line; Equipment (Hose / Fender) · Type · Last test underneath. */
export function EquipmentOptionLabel({ option }) {
  return (
    <span className="min-w-0">
      <span className="block font-medium text-white">{option.code || option.label}</span>
      <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/60">
        <span>
          Equipment: <span className="text-white/85">{option.label}</span>
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

/** Matches serial number, equipment name, type or last test date (case-insensitive). */
function matchesEquipmentSearch(option, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [option.code, option.label, option.type, formatEquipmentTestDate(option.lastTest)]
    .some((v) => String(v || "").toLowerCase().includes(q));
}

/**
 * Open dropdown panel: search box on top, then the checkbox list filtered by it.
 * Ticked items stay selected while searching.
 */
export function EquipmentOptionsPanel({ options, selected, loading, onToggle }) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((opt) => matchesEquipmentSearch(opt, query));

  return (
    <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl overflow-hidden">
      <div className="border-b border-white/10 p-2">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter in the search box must not submit the operation form
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Search serial no., hose / fender, type..."
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/30"
        />
        {!loading && options.length > 0 && (
          <p className="mt-1 px-1 text-[11px] text-white/45">
            {query.trim()
              ? `${filtered.length} of ${options.length} match`
              : `${options.length} available`}
            {selected.length > 0 && ` · ${selected.length} selected`}
          </p>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {loading && <div className="px-4 py-3 text-sm text-white/70">Loading...</div>}
        {!loading && !options.length && (
          <div className="px-4 py-3 text-sm text-white/60">No available equipment</div>
        )}
        {!loading && options.length > 0 && !filtered.length && (
          <div className="px-4 py-3 text-sm text-white/60">No equipment matches “{query.trim()}”</div>
        )}
        {!loading &&
          filtered.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10 cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-white/50 bg-transparent text-orange-400 focus:ring-orange-400"
                checked={selected.includes(String(opt.value))}
                onChange={() => onToggle(opt.value)}
              />
              <EquipmentOptionLabel option={opt} />
            </label>
          ))}
      </div>
    </div>
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
