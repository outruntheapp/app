// supabase/functions/process-activities/index.ts
// Purpose: Match activities to stages (participants only)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { matchesRoute } from "../_shared/geo.ts";
import { logInfo, logError } from "../_shared/logger.ts";
import { writeAuditLog } from "../_shared/audit.ts";

serve(async () => {
  try {
    logInfo("Processing activities");

    // Get active challenge
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

    // Get all routes for this challenge
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

    // Get unprocessed activities
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
        // 1️⃣ Enforce challenge date window
        const activityDate = new Date(act.started_at);
        const challengeStart = new Date(challenge.starts_at);
        const challengeEnd = new Date(challenge.ends_at);

        if (activityDate < challengeStart || activityDate > challengeEnd) {
          // Mark as processed even if outside window (silent ignore)
          await supabaseAdmin
            .from("activities")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", act.id);
          processed++;
          continue;
        }

        // 2️⃣ Enforce participant (ticket holder) rule
        const { data: participant, error: participantError } = await supabaseAdmin
          .from("participants")
          .select("id, excluded")
          .eq("user_id", act.user_id)
          .eq("challenge_id", challenge.id)
          .single();

        if (participantError || !participant || participant.excluded) {
          // Mark as processed (silent ignore)
          await supabaseAdmin
            .from("activities")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", act.id);
          processed++;
          continue;
        }

        // 3️⃣ Try to match against each route
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
            // Continue to next route
            continue;
          }
        }

        if (!matchedRoute) {
          // No match found, mark as processed (silent ignore)
          await supabaseAdmin
            .from("activities")
            .update({ processed_at: new Date().toISOString() })
            .eq("id", act.id);
          processed++;
          continue;
        }

        // 4️⃣ Record stage result (best time logic enforced by upsert)
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

          // Log stage completion
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

        // 5️⃣ Mark activity as processed
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
        // Continue with next activity
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
