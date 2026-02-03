// src/lib/ensureChallengeRoutes.js
// Server-only: check if a challenge has route entries; if not, import from GPX in public/routes/<slug>/.

import fs from "fs";
import path from "path";

function parseGpxTrkpt(gpxText) {
  const coords = [];
  const regex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
  let m;
  while ((m = regex.exec(gpxText)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) coords.push({ lat, lon });
  }
  return coords;
}

function coordsToWkt(coords) {
  if (!coords || coords.length === 0) return null;
  return `LINESTRING(${coords.map((c) => `${c.lon} ${c.lat}`).join(", ")})`;
}

function loadGpxFromFs(slug, stage) {
  const safeSlug = slug && /^[a-zA-Z0-9_-]+$/.test(slug) ? slug : "challenge_1";
  const publicPath = path.join(process.cwd(), "public", "routes", safeSlug, `stage-${stage}.gpx`);
  try {
    if (fs.existsSync(publicPath)) return fs.readFileSync(publicPath, "utf8");
  } catch (_) {}
  return null;
}

/**
 * Ensure a challenge has route entries in the DB. If it has none, import from public/routes/<slug>/stage-1..3.gpx.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - service role client
 * @param {string} challengeId - challenge uuid
 * @param {string} slug - challenge slug (e.g. challenge_1)
 * @returns {{ synced: boolean, count: number, error?: string }}
 */
export async function ensureChallengeRoutes(supabase, challengeId, slug) {
  const { count, error: countError } = await supabase
    .from("routes")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId);
  if (countError) return { synced: false, count: 0, error: countError.message };
  if (count > 0) return { synced: false, count };

  const wkts = { 1: null, 2: null, 3: null };
  for (let stage = 1; stage <= 3; stage++) {
    const gpxText = loadGpxFromFs(slug, stage);
    if (!gpxText) continue;
    const coords = parseGpxTrkpt(gpxText);
    if (coords.length > 0) wkts[stage] = coordsToWkt(coords);
  }
  if (!wkts[1] && !wkts[2] && !wkts[3]) {
    return { synced: false, count: 0, error: "No GPX files found for slug" };
  }

  const { error: rpcError } = await supabase.rpc("sync_challenge_routes_from_wkt", {
    p_challenge_id: challengeId,
    p_wkt_1: wkts[1] || null,
    p_wkt_2: wkts[2] || null,
    p_wkt_3: wkts[3] || null,
  });
  if (rpcError) return { synced: false, count: 0, error: rpcError.message };
  const inserted = [wkts[1], wkts[2], wkts[3]].filter(Boolean).length;
  return { synced: true, count: inserted };
}

/**
 * Force re-import routes from GPX for a challenge (public/routes/<slug>/stage-1..3.gpx).
 * Always calls sync_challenge_routes_from_wkt, replacing existing route rows for that challenge.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - service role client
 * @param {string} challengeId - challenge uuid
 * @param {string} slug - challenge slug (e.g. challenge_1)
 * @returns {{ synced: boolean, count: number, error?: string }}
 */
export async function forceSyncChallengeRoutesFromGpx(supabase, challengeId, slug) {
  const wkts = { 1: null, 2: null, 3: null };
  for (let stage = 1; stage <= 3; stage++) {
    const gpxText = loadGpxFromFs(slug, stage);
    if (!gpxText) continue;
    const coords = parseGpxTrkpt(gpxText);
    if (coords.length > 0) wkts[stage] = coordsToWkt(coords);
  }
  if (!wkts[1] && !wkts[2] && !wkts[3]) {
    return { synced: false, count: 0, error: "No GPX files found for slug" };
  }
  const { error: rpcError } = await supabase.rpc("sync_challenge_routes_from_wkt", {
    p_challenge_id: challengeId,
    p_wkt_1: wkts[1] || null,
    p_wkt_2: wkts[2] || null,
    p_wkt_3: wkts[3] || null,
  });
  if (rpcError) return { synced: false, count: 0, error: rpcError.message };
  const count = [wkts[1], wkts[2], wkts[3]].filter(Boolean).length;
  return { synced: true, count };
}
