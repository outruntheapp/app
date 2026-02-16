// src/pages/api/routes.js
// Purpose: Return route data from GPX in public/routes/challenge_1 (fetched via HTTP, then fs fallback).
// Syncs routes into the DB via sync_challenge_routes_from_wkt so process-activities can match.

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ROUTES_BUCKET = "routes";
const SAFE_SLUG = /^[a-zA-Z0-9_-]+$/;

const LOG = (level, message, meta = {}) => {
  const prefix = "[Routes API]";
  const payload = Object.keys(meta).length ? { ...meta } : null;
  if (level === "error") console.error(prefix, message, payload ?? "");
  else if (level === "warn") console.warn(prefix, message, payload ?? "");
  else console.log(prefix, message, payload ?? "");
};

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

/** Load GPX text: try HTTP first, then fs from public (for serverless where self-fetch can fail). Uses active challenge slug. */
async function loadGpxText(stage, baseUrl, req, slug, supabase) {
  const safeSlug = slug && SAFE_SLUG.test(slug) ? slug : "challenge_1";

  // Prefer Supabase Storage (production-friendly)
  if (supabase) {
    const objectPath = `${safeSlug}/stage-${stage}.gpx`;
    try {
      const { data, error } = await supabase.storage.from(ROUTES_BUCKET).download(objectPath);
      if (!error && data) {
        if (typeof data.text === "function") return await data.text();
        if (typeof data.arrayBuffer === "function") {
          const ab = await data.arrayBuffer();
          return Buffer.from(ab).toString("utf8");
        }
      } else if (error) {
        LOG("warn", "storage download failed", { stage, slug: safeSlug, message: error.message });
      }
    } catch (e) {
      LOG("warn", "storage download threw", { stage, slug: safeSlug, message: e.message });
    }
  }

  // Back-compat: try static public/ routes (or HTTP to /routes for dev)
  const url = `${baseUrl}/routes/${safeSlug}/stage-${stage}.gpx`;
  try {
    const response = await fetch(url);
    if (response.ok) return await response.text();
    LOG("warn", "fetch GPX not ok", { stage, slug: safeSlug, status: response.status });
  } catch (fetchErr) {
    LOG("warn", "fetch GPX failed, trying fs", { stage, slug: safeSlug, err: fetchErr.message });
  }
  const publicPath = path.join(process.cwd(), "public", "routes", safeSlug, `stage-${stage}.gpx`);
  try {
    if (fs.existsSync(publicPath)) return fs.readFileSync(publicPath, "utf8");
  } catch (fsErr) {
    LOG("error", "fs read GPX failed", { stage, publicPath, err: fsErr.message });
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    let activeSlug = "challenge_1";
    let activeChallengeId = null;
    let supabase = null;
    if (supabaseUrl && serviceRoleKey) {
      supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: activeChallenge } = await supabase
        .from("challenges")
        .select("id, slug")
        .eq("is_active", true)
        .single();
      if (activeChallenge?.slug) activeSlug = activeChallenge.slug;
      if (activeChallenge?.id) activeChallengeId = activeChallenge.id;
    }

    const baseUrl = getBaseUrl(req);
    const routes = [];
    const wkts = { 1: null, 2: null, 3: null };

    for (let stage = 1; stage <= 3; stage++) {
      const gpxText = await loadGpxText(stage, baseUrl, req, activeSlug, supabase);
      if (!gpxText) continue;

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
    if (supabaseUrl && serviceRoleKey && activeChallengeId && (wkts[1] || wkts[2] || wkts[3])) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { error: rpcError } = await supabase.rpc("sync_challenge_routes_from_wkt", {
        p_challenge_id: activeChallengeId,
        p_wkt_1: wkts[1] || null,
        p_wkt_2: wkts[2] || null,
        p_wkt_3: wkts[3] || null,
      });
      if (rpcError) {
        LOG("warn", "sync RPC failed", { message: rpcError.message });
      } else {
        LOG("info", "routes synced to DB", { challengeId: activeChallengeId });
      }
    }

    LOG("info", "returning routes", { count: routes.length });
    return res.status(200).json(routes);
  } catch (err) {
    LOG("error", "handler error", { message: err.message, stack: err.stack });
    return res.status(500).json({ error: "Failed to load route data" });
  }
}
