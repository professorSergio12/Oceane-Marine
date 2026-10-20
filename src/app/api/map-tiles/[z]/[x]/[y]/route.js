import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * Caching proxy for CARTO Positron basemap tiles.
 *
 * Each tile is fetched from CARTO once, stored on disk and served from there
 * for TILE_TTL_MS, so dashboard refreshes / multiple users don't count against
 * the CARTO request quota. Also keeps CARTO_API_KEY server-side.
 *
 * GET /api/map-tiles/{z}/{x}/{y}.png   (or {y}@2x.png for retina)
 */

const CARTO_API_KEY = process.env.CARTO_API_KEY;
const CACHE_DIR = path.join(process.cwd(), ".cache", "map-tiles");
const TILE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (same as CARTO's max-age)
const MAX_ZOOM = 10; // matches OperationsMap maxZoom

// Avoid fetching the same tile twice when several requests arrive together
const inFlight = new Map();

const tileHeaders = {
  "Content-Type": "image/png",
  "Cache-Control": "private, max-age=2592000, immutable",
};

async function readCachedTile(file) {
  try {
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > TILE_TTL_MS) return null;
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

async function fetchAndCacheTile(z, x, y, retina, file) {
  const url = `https://basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}${retina ? "@2x" : ""}.png?key=${CARTO_API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CARTO responded ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer);
  return buffer;
}

export async function GET(_req, { params }) {
  if (!CARTO_API_KEY) {
    return NextResponse.json({ success: false, error: "CARTO_API_KEY not configured" }, { status: 503 });
  }

  const { z: zRaw, x: xRaw, y: yRaw } = await params;
  const match = /^(\d+)(@2x)?\.png$/.exec(yRaw);
  const z = Number(zRaw);
  const x = Number(xRaw);
  const y = match ? Number(match[1]) : NaN;
  const retina = Boolean(match?.[2]);

  const maxIndex = 2 ** z;
  if (
    !Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) ||
    z < 0 || z > MAX_ZOOM || x < 0 || x >= maxIndex || y < 0 || y >= maxIndex
  ) {
    return NextResponse.json({ success: false, error: "Invalid tile" }, { status: 400 });
  }

  const file = path.join(CACHE_DIR, String(z), String(x), `${y}${retina ? "@2x" : ""}.png`);

  const cached = await readCachedTile(file);
  if (cached) return new NextResponse(cached, { headers: tileHeaders });

  try {
    let pending = inFlight.get(file);
    if (!pending) {
      pending = fetchAndCacheTile(z, x, y, retina, file).finally(() => inFlight.delete(file));
      inFlight.set(file, pending);
    }
    const buffer = await pending;
    return new NextResponse(buffer, { headers: tileHeaders });
  } catch (err) {
    console.error("Map tile fetch error:", err);
    return NextResponse.json({ success: false, error: "Tile unavailable" }, { status: 502 });
  }
}
