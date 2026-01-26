// demo/generate-demo-polylines.js
// Purpose: Read route GPX files, encode to Google polyline, write demo/demoPolylines.json.
// Use: node demo/generate-demo-polylines.js (from project root)

const fs = require("fs");
const path = require("path");
const { encode } = require("@googlemaps/polyline-codec");

const ROUTES_DIR = path.join(__dirname, "..", "routes", "challenge_1");
const OUT_FILE = path.join(__dirname, "demoPolylines.json");

/**
 * Parse GPX text and return array of [lat, lon] from <trkpt lat="" lon=""> elements.
 * Same coordinate order as Google polyline (lat, lon).
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

function main() {
  if (!fs.existsSync(ROUTES_DIR)) {
    console.error("Routes directory not found:", ROUTES_DIR);
    process.exit(1);
  }

  const polylines = {};

  for (let stage = 1; stage <= 3; stage++) {
    const gpxPath = path.join(ROUTES_DIR, `stage-${stage}.gpx`);
    if (!fs.existsSync(gpxPath)) {
      console.warn("GPX file not found:", gpxPath);
      continue;
    }
    const gpxText = fs.readFileSync(gpxPath, "utf8");
    const latLon = parseGpxToLatLon(gpxText);
    if (latLon.length === 0) {
      console.warn("No coordinates in", gpxPath);
      continue;
    }
    const encoded = encode(latLon, 5);
    polylines[String(stage)] = encoded;
    console.log("Stage", stage, ":", latLon.length, "points -> polyline length", encoded.length);
  }

  if (Object.keys(polylines).length === 0) {
    console.error("No polylines generated.");
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(polylines, null, 2), "utf8");
  console.log("Wrote", OUT_FILE);
}

main();
