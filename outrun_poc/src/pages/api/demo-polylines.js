// API route: return Google-encoded polylines for demo stages (from route GPX).
// Purpose: Let init-demo-data create activities that match route geometry for matching.

import fs from "fs";
import path from "path";
import { encode } from "@googlemaps/polyline-codec";

const PRECISION = 5;

/**
 * Parse GPX text and return array of [lat, lon] from <trkpt lat="" lon=""> elements.
 */
function parseGpxToLatLon(gpxText) {
  const coords = [];
  const regex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  let m;
  while ((m = regex.exec(gpxText)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      coords.push([lat, lon]);
    }
  }
  return coords;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const baseDir = path.join(process.cwd(), "routes", "challenge_1");
    const polylines = {};

    for (let stage = 1; stage <= 3; stage++) {
      const filePath = path.join(baseDir, `stage-${stage}.gpx`);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const gpxText = fs.readFileSync(filePath, "utf8");
      const latLon = parseGpxToLatLon(gpxText);
      if (latLon.length === 0) {
        continue;
      }
      polylines[stage] = encode(latLon, PRECISION);
    }

    return res.status(200).json(polylines);
  } catch (err) {
    console.error("demo-polylines API error:", err);
    return res.status(500).json({ error: "Failed to generate demo polylines" });
  }
}
