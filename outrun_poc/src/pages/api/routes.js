// API route: return route data from local GPX files (./routes/challenge_1)
// Used when the routes table is empty so the Routes page can still display stages.

import fs from "fs";
import path from "path";

/**
 * Parse GPX text and return array of { lat, lon } from <trkpt> elements.
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

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const baseDir = path.join(process.cwd(), "routes", "challenge_1");
    const routes = [];

    for (let stage = 1; stage <= 3; stage++) {
      const filePath = path.join(baseDir, `stage-${stage}.gpx`);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const gpxText = fs.readFileSync(filePath, "utf8");
      const coords = parseGpxTrkpt(gpxText);
      if (coords.length === 0) {
        routes.push({
          stage_number: stage,
          buffer_meters: 30,
          min_overlap_ratio: 0.8,
          gpx_geo: null,
        });
        continue;
      }
      // GeoJSON LineString: [lon, lat] for each position
      const coordinates = coords.map((c) => [c.lon, c.lat]);
      routes.push({
        stage_number: stage,
        buffer_meters: 30,
        min_overlap_ratio: 0.8,
        gpx_geo: {
          type: "LineString",
          coordinates,
        },
      });
    }

  return res.status(200).json(routes);
  } catch (err) {
    console.error("Routes API error:", err);
    return res.status(500).json({ error: "Failed to load route data" });
  }
}
