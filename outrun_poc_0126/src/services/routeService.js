// src/services/routeService.js
// Purpose: Fetch route data from Supabase and from GPX (API) for map display

import { supabase } from "./supabaseClient";
import { logError, logInfo } from "../utils/logger";
import { fetchActiveChallenge } from "./challengeService";

/**
 * Fetch routes from GPX only (GET /api/routes). For map display on the Routes page.
 * Does not use Supabase; returns GeoJSON gpx_geo so RouteMap can render.
 * Use fetchActiveChallengeRoutes() when you need DB-backed routes (e.g. run matching).
 */
export async function fetchRoutesForMap() {
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${baseUrl}/api/routes`);
    if (!res.ok) {
      logError("fetchRoutesForMap: API routes failed", { status: res.status, statusText: res.statusText });
      return [];
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    if (list.length > 0) {
      logInfo("fetchRoutesForMap: loaded routes from API", { count: list.length });
    }
    return list;
  } catch (err) {
    logError("fetchRoutesForMap: failed", err);
    return [];
  }
}

/**
 * Fetch all routes for the active challenge from Supabase (with API fallback when no usable geometry).
 * Use for features that need DB-backed routes (e.g. overlap checks). Routes page map uses fetchRoutesForMap().
 */
export async function fetchActiveChallengeRoutes() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      return [];
    }

    const { data, error } = await supabase
      .from("routes")
      .select("id, challenge_id, stage_number, buffer_meters, min_overlap_ratio, gpx_geo")
      .eq("challenge_id", challenge.id)
      .order("stage_number", { ascending: true });

    if (error) {
      logError("fetchActiveChallengeRoutes: Supabase routes error", error);
      throw error;
    }
    const fromDb = data || [];

    // Prefer API (GPX) when DB has no usable geometry so the map can render
    const hasUsableGeometry = (r) =>
      r &&
      (typeof r.gpx_geo === "string" ||
        (r.gpx_geo && r.gpx_geo.type === "LineString" && Array.isArray(r.gpx_geo.coordinates) && r.gpx_geo.coordinates.length > 0));
    const dbHasUsableRoutes = fromDb.length > 0 && fromDb.some(hasUsableGeometry);

    if (dbHasUsableRoutes) {
      return fromDb;
    }

    if (fromDb.length > 0) {
      logInfo("fetchActiveChallengeRoutes: DB routes have no usable gpx_geo, falling back to API", {
        count: fromDb.length,
      });
    }

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${baseUrl}/api/routes`);
    if (!res.ok) {
      logError("fetchActiveChallengeRoutes: API routes failed", { status: res.status, statusText: res.statusText });
      return fromDb.length > 0 ? fromDb : [];
    }
    const fromApi = await res.json();
    const list = Array.isArray(fromApi) ? fromApi : [];
    if (list.length > 0) {
      logInfo("fetchActiveChallengeRoutes: loaded routes from API", { count: list.length });
    }
    return list.length > 0 ? list : fromDb;
  } catch (err) {
    logError("fetchActiveChallengeRoutes: failed", err);
    return [];
  }
}

/**
 * Fetch route for a specific stage
 */
export async function fetchRouteForStage(stageNumber) {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      return null;
    }

    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .eq("challenge_id", challenge.id)
      .eq("stage_number", stageNumber)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      throw error;
    }

    return data || null;
  } catch (err) {
    logError("Failed to fetch route for stage", err);
    return null;
  }
}
