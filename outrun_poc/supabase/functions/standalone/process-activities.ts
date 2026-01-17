// Standalone version for Supabase Dashboard deployment
// Copy this entire file into Supabase Dashboard → Edge Functions → Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Shared Code (inlined)
// ============================================================================

const supabaseAdmin = createClient(
  Deno.env.get("DB_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

function logInfo(message: string, meta: unknown = {}) {
  console.log(JSON.stringify({ level: "info", message, meta }));
}

function logError(message: string, error: unknown) {
  console.error(JSON.stringify({ level: "error", message, error }));
}

async function writeAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });
}

async function matchesRoute({
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

// ============================================================================
// Main Function
// ============================================================================

serve(async () => {
  try {
    logInfo("Processing activities");

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .single();

    if (challengeError || !challenge) {
      logError("No active challenge found", challengeError);
      return new Response(
        JSON.stringify({ error: "No active challenge" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: routes, error: routesError } = await supabaseAdmin
      .from("routes")
      .select("*")
      .eq("challenge_id", challenge.id);

    if (routesError) {
      throw new Error(`Failed to fetch routes: ${routesError.message}`);
    }

    if (!routes || routes.length === 0) {
      logInfo("No routes configured for challenge", { challengeId: challenge.id });
      return new Response(
        JSON.stringify({ message: "No routes configured" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from("activities")
      .select("*")
      .is("processed_at", null);

    if (activitiesError) {
      throw new Error(`Failed to fetch activities: ${activitiesError.message}`);
    }

    if (!activities || activities.length === 0) {
      logInfo("No unprocessed activities");
      return new Response(
        JSON.stringify({ message: "No activities to process" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let matched = 0;

    for (const act of activities) {
      try {
        const activityDate = new Date(act.started_at);
        const challengeStart = new Date(challenge.starts_at);
        const challengeEnd = new Date(challenge.ends_at);

        if (activityDate < challengeStart || activityDate > challengeEnd) {
          await supabaseAdmin
            .from("activities")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", act.id);
          processed++;
          continue;
        }

        const { data: participant, error: participantError } = await supabaseAdmin
          .from("participants")
          .select("id, excluded")
          .eq("user_id", act.user_id)
          .eq("challenge_id", challenge.id)
          .single();

        if (participantError || !participant || participant.excluded) {
          await supabaseAdmin
            .from("activities")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", act.id);
          processed++;
          continue;
        }

        let matchedRoute = null;
        for (const route of routes) {
          try {
            const isMatch = await matchesRoute({
              activityLine: act.polyline,
              routeId: route.id,
            });

            if (isMatch) {
              matchedRoute = route;
              break;
            }
          } catch (err) {
            logError("Route matching error", {
              activityId: act.id,
              routeId: route.id,
              error: err,
            });
            continue;
          }
        }

        if (!matchedRoute) {
          await supabaseAdmin
            .from("activities")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", act.id);
          processed++;
          continue;
        }

        const { data: existingResult } = await supabaseAdmin
          .from("stage_results")
          .select("best_time_seconds")
          .eq("user_id", act.user_id)
          .eq("challenge_id", challenge.id)
          .eq("stage_number", matchedRoute.stage_number)
          .single();

        const isNewBest =
          !existingResult ||
          act.elapsed_seconds < existingResult.best_time_seconds;

        if (isNewBest) {
          await supabaseAdmin.from("stage_results").upsert(
            {
              user_id: act.user_id,
              challenge_id: challenge.id,
              stage_number: matchedRoute.stage_number,
              best_time_seconds: act.elapsed_seconds,
              completed_at: act.started_at,
            },
            {
              onConflict: "user_id,challenge_id,stage_number",
            }
          );

          await writeAuditLog({
            actorId: act.user_id,
            action: "STAGE_COMPLETED",
            entityType: "stage_result",
            entityId: null,
            metadata: {
              challenge_id: challenge.id,
              stage_number: matchedRoute.stage_number,
              time_seconds: act.elapsed_seconds,
              activity_id: act.id,
            },
          });

          matched++;
        }

        await supabaseAdmin
          .from("activities")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", act.id);

        processed++;
      } catch (err) {
        logError("Failed to process activity", {
          activityId: act.id,
          error: err,
        });
        continue;
      }
    }

    logInfo("Activity processing completed", { processed, matched });

    return new Response(
      JSON.stringify({ message: "Processing completed", processed, matched }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Processing failed", err);
    return new Response(
      JSON.stringify({ error: "Processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
