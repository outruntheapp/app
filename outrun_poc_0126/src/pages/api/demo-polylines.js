// src/pages/api/demo-polylines.js
// Purpose: Return Google-encoded polylines for demo stages from public/routes/challenge_1 (fetched via HTTP).

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

function getBaseUrl(req) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req?.headers?.host;
  if (host) return `http://${host}`;
  return "http://localhost:3000";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const baseUrl = getBaseUrl(req);
    const polylines = {};

    for (let stage = 1; stage <= 3; stage++) {
      const url = `${baseUrl}/routes/challenge_1/stage-${stage}.gpx`;
      let gpxText;
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        gpxText = await response.text();
      } catch (fetchErr) {
        console.warn("demo-polylines API: fetch GPX failed", url, fetchErr.message);
        continue;
      }

      const latLon = parseGpxToLatLon(gpxText);
      if (latLon.length === 0) continue;

      polylines[stage] = encode(latLon, PRECISION);
    }

    return res.status(200).json(polylines);
  } catch (err) {
    console.error("demo-polylines API error:", err);
    return res.status(500).json({ error: "Failed to generate demo polylines" });
  }
}
