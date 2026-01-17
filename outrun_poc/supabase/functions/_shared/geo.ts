// supabase/functions/_shared/geo.ts
// Purpose: Deterministic GPS route matching

import { supabaseAdmin } from "./supabase.ts";

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
