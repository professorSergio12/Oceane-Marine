"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ─────────── colour helpers ─────────── */
function markerColour(loc) {
  if (loc.inProgress > 0) return "#60a5fa"; // light blue – active
  if (loc.completed > 0)  return "#34d399"; // light green – all done
  if (loc.cancelled > 0)  return "#f87171"; // light red – cancelled
  return "#fbbf24";                          // light amber – lined-up / pending
}

function markerRadius(total) {
  if (total >= 20) return 16;
  if (total >= 10) return 13;
  if (total >= 5)  return 10;
  return 8;
}

/* ─────────── marker popup ─────────── */
const POPUP_STATUSES = [
  { key: "inProgress", label: "In Progress", colour: "#2563eb" },
  { key: "completed",  label: "Completed",   colour: "#059669" },
  { key: "pending",    label: "Pending",     colour: "#d97706" },
  { key: "cancelled",  label: "Cancelled",   colour: "#dc2626" },
];

const OP_STATUS_COLOUR = {
  INPROGRESS: "#2563eb",
  COMPLETED: "#059669",
  CANCELED: "#dc2626",
};

/**
 * Fixed-size popup: long location / operation lists scroll inside instead of growing the card.
 * Uses <div> rather than <p> because Leaflet gives <p> inside popups a 17px margin.
 */
function LocationPopup({ loc }) {
  const locations = loc.locations || [];
  const isGroup = locations.length > 1;

  return (
    <div className="w-full text-gray-800">
      <div className="font-bold text-sm leading-snug line-clamp-2" style={{ color: "#1e40af" }} title={loc.name}>
        {isGroup ? `${locations.length} locations at this point` : loc.name}
      </div>

      {/* Total + status counts */}
      <div className="mt-2 flex items-center gap-3">
        <div className="text-center shrink-0">
          <div className="text-2xl font-bold leading-none">{loc.total}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">Total</div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] flex-1">
          {POPUP_STATUSES.map((s) => (
            <span key={s.key} className={`flex items-center gap-1.5 ${loc[s.key] ? "" : "opacity-40"}`}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.colour }} />
              <span className="text-gray-500 truncate">{s.label}</span>
              <span className="ml-auto font-semibold">{loc[s.key] || 0}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Per-location counts when several locations share these coordinates */}
      {isGroup && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Locations</div>
          <div className="max-h-[72px] overflow-y-auto pr-1 space-y-0.5 light-panel-scroll">
            {[...locations].sort((a, b) => b.total - a.total).map((l) => (
              <div key={l.name} className="flex justify-between gap-3 text-[11px] text-gray-600">
                <span className="truncate" title={l.name}>{l.name}</span>
                <span className="font-semibold text-gray-800 shrink-0">{l.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent operations */}
      {loc.operations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Recent</div>
          <div className="max-h-[96px] overflow-y-auto pr-1 space-y-0.5 light-panel-scroll">
            {loc.operations.map((op, i) => (
              <div key={`${op.refNo}-${i}`} className="flex items-center gap-1.5 text-[11px] text-gray-600 leading-tight">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: OP_STATUS_COLOUR[op.status] || "#d97706" }}
                />
                <span className="font-medium text-gray-800 shrink-0">{op.refNo}</span>
                {op.chs && <span className="text-gray-400 truncate" title={op.chs}>· {op.chs}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── auto-fit bounds ─────────── */
function FitBounds({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const bounds = markers.map((m) => [m.lat, m.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [markers, map]);

  return null;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function OperationsMap({ year, month }) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (year)  params.append("year", year.toString());
        if (month) params.append("month", month.toString());

        const res = await fetch(`/api/operations/dashboard/map-data?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setMarkers(json.data || []);
        }
      } catch (err) {
        console.error("Map fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, month]);

  const totalOps = markers.reduce((s, m) => s + m.total, 0);

  return (
    <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md shadow-2xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Operations Map</h2>
          <p className="text-xs text-slate-400">
            {markers.length} location{markers.length !== 1 ? "s" : ""} · {totalOps} operation{totalOps !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] text-slate-300">
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" /> In Progress</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" /> Completed</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Pending</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" /> Cancelled</span>
        </div>
      </div>

      {/* Map */}
      <div className="w-full h-[380px] rounded-xl overflow-hidden border border-white/10 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        )}

        <MapContainer
          ref={mapRef}
          center={[20, 55]}
          zoom={3}
          minZoom={2}
          maxZoom={10}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ background: "#dce6f0" }}
        >
          {/* CARTO Positron (light) – served via our caching proxy to save CARTO quota */}
          <TileLayer
            url="/api/map-tiles/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Auto-fit when data changes */}
          {markers.length > 0 && <FitBounds markers={markers} />}

          {/* Markers */}
          {markers.map((loc) => (
            <CircleMarker
              key={loc.key || loc.name}
              center={[loc.lat, loc.lng]}
              radius={markerRadius(loc.total)}
              pathOptions={{
                fillColor: markerColour(loc),
                color: markerColour(loc),
                weight: 2,
                fillOpacity: 0.55,
                opacity: 0.8,
              }}
            >
              <Popup minWidth={240} maxWidth={260} autoPanPadding={[16, 16]}>
                <LocationPopup loc={loc} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
