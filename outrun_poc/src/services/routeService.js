// src/services/routeService.js
// Purpose: Fetch route data from Supabase

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";
import { fetchActiveChallenge } from "./challengeService";

/**
 * Fetch all routes for the active challenge
 * Note: Supabase PostgREST automatically converts PostGIS geography to GeoJSON format
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

    if (error) throw error;
    return data || [];
  } catch (err) {
    logError("Failed to fetch routes", err);
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
