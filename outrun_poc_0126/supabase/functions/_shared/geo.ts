// supabase/functions/_shared/geo.ts
// Purpose: Deterministic GPS route matching

import { supabaseAdmin } from "./supabase.ts";

/**
 * Calls match_activity_to_route RPC. activityLine must be Google encoded polyline, precision 5
 * (Strava map.summary_polyline); do not truncate or re-encode.
 */
export async function matchesRoute({
  activityLine,
  routeId,
}: {
  activityLine: string;
  routeId: string;
}): Promise<boolean> {
  const { data: result, error } = await supabaseAdmin.rpc(
    "match_activity_to_route",
    {
      activity_polyline: activityLine,
      route_id: routeId,
    }
  );

  if (error) {
    throw new Error(`Route matching error: ${error.message}`);
  }

  return result === true;
}

/**
 * Calls match_activity_to_route_debug RPC; returns matched flag and overlap_ratio (0–1) for audit metadata.
 * activityLine must be Google encoded polyline, precision 5 (Strava map.summary_polyline).
 */
export async function matchesRouteWithOverlap({
  activityLine,
  routeId,
}: {
  activityLine: string;
  routeId: string;
}): Promise<{ matched: boolean; overlap_ratio: number | null }> {
  const { data: result, error } = await supabaseAdmin.rpc(
    "match_activity_to_route_debug",
    {
      activity_polyline: activityLine,
      route_id: routeId,
    }
  );

  if (error) {
    throw new Error(`Route matching error: ${error.message}`);
  }

  if (result == null || typeof result !== "object") {
    return { matched: false, overlap_ratio: null };
  }

  const matched = result.matched === true;
  const overlap_ratio =
    typeof result.overlap_ratio === "number" && Number.isFinite(result.overlap_ratio)
      ? result.overlap_ratio
      : null;

  return { matched, overlap_ratio };
}
