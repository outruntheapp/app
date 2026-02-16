// src/pages/api/route-geometry.js
// Purpose: Return GeoJSON + bounds for a single stage GPX (for Leaflet map, no API key).

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SAFE_PARAM = /^[a-zA-Z0-9_-]+$/;
const ROUTES_BUCKET = "routes";

function validateParam(name, value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) return false;
  return SAFE_PARAM.test(value);
}

/**
 * Parse GPX text and return array of { lat, lon } from <trkpt lat="" lon=""> elements.
 */
function parseGpxTrkpt(gpxText) {
  const coords = [];
  const regex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  let m;
  while ((m = regex.exec(gpxText)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      coords.push({ lat, lon });
    }
  }
  return coords;
}

/**
 * Simplify by keeping first, last, and every nth point. Cap to ~maxPoints.
 */
function simplifyCoords(coords, maxPoints = 2500) {
  if (!coords || coords.length <= maxPoints) return coords;
  const result = [coords[0]];
  const n = coords.length;
  const step = (n - 2) / (maxPoints - 2);
  for (let i = 1; i < maxPoints - 1; i++) {
    const index = Math.round(1 + (i - 1) * step);
    if (index > 0 && index < n) result.push(coords[index]);
  }
  result.push(coords[n - 1]);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const challenge = req.query.challenge;
  const stage = req.query.stage;
  const simplify = req.query.simplify === "1";

  if (!validateParam("challenge", challenge) || !validateParam("stage", stage)) {
    return res.status(422).json({ error: "Invalid challenge or stage parameter" });
  }

  let gpxText = null;

  // Prefer Supabase Storage (production-friendly)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const objectPath = `${challenge}/${stage}.gpx`;
      const { data, error } = await supabase.storage.from(ROUTES_BUCKET).download(objectPath);
      if (!error && data) {
        if (typeof data.text === "function") gpxText = await data.text();
        else if (typeof data.arrayBuffer === "function") {
          const ab = await data.arrayBuffer();
          gpxText = Buffer.from(ab).toString("utf8");
        }
      }
    }
  } catch (_) {
    // ignore and fall back to filesystem
  }

  // Back-compat: local public/ routes
  if (!gpxText) {
    const gpxPath = path.join(process.cwd(), "public", "routes", challenge, `${stage}.gpx`);
    if (!fs.existsSync(gpxPath)) {
      return res.status(404).json({ error: "GPX not found" });
    }
    try {
      gpxText = fs.readFileSync(gpxPath, "utf8");
    } catch (err) {
      return res.status(500).json({ error: "Failed to read GPX file" });
    }
  }

  let coords = parseGpxTrkpt(gpxText);
  if (coords.length === 0) {
    return res.status(404).json({ error: "No track points in GPX" });
  }

  if (simplify) {
    coords = simplifyCoords(coords);
  }

  // GeoJSON: [lng, lat]
  const coordinates = coords.map((c) => [c.lon, c.lat]);

  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const bounds = [[minLat, minLng], [maxLat, maxLng]];

  const geojson = {
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: {},
  };

  const meta = { pointCount: coordinates.length };

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json({ geojson, bounds, meta });
}
