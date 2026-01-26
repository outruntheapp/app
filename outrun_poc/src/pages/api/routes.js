// src/pages/api/routes.js
// Purpose: Return route data from GPX in public/routes/challenge_1 (fetched via HTTP).
// Syncs routes into the DB via sync_challenge_routes_from_wkt so process-activities can match.

import { createClient } from "@supabase/supabase-js";

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

/** Build PostGIS LINESTRING WKT from coords: lon1 lat1, lon2 lat2, ... */
function coordsToWkt(coords) {
  if (!coords || coords.length === 0) return null;
  const points = coords.map((c) => `${c.lon} ${c.lat}`).join(", ");
  return `LINESTRING(${points})`;
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
    const routes = [];
    const wkts = { 1: null, 2: null, 3: null };

    for (let stage = 1; stage <= 3; stage++) {
      const url = `${baseUrl}/routes/challenge_1/stage-${stage}.gpx`;
      let gpxText;
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        gpxText = await response.text();
      } catch (fetchErr) {
        console.warn("Routes API: fetch GPX failed", url, fetchErr.message);
        continue;
      }

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

      const wkt = coordsToWkt(coords);
      if (wkt) wkts[stage] = wkt;

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

    // Sync to DB when we have an active challenge and at least one WKT
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey && (wkts[1] || wkts[2] || wkts[3])) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: challenge, error: challengeError } = await supabase
        .from("challenges")
        .select("id")
        .eq("is_active", true)
        .single();
      if (!challengeError && challenge?.id) {
        const { error: rpcError } = await supabase.rpc("sync_challenge_routes_from_wkt", {
          p_challenge_id: challenge.id,
          p_wkt_1: wkts[1] || null,
          p_wkt_2: wkts[2] || null,
          p_wkt_3: wkts[3] || null,
        });
        if (rpcError) {
          console.warn("Routes API: sync RPC failed", rpcError.message);
        }
      }
    }

    return res.status(200).json(routes);
  } catch (err) {
    console.error("Routes API error:", err);
    return res.status(500).json({ error: "Failed to load route data" });
  }
}
