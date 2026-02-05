// supabase/functions/sync-strava-activities/index.ts
// Purpose: Poll Strava and ingest raw activities

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { getValidAccessToken, fetchAthleteActivities } from "../_shared/strava.ts";
import { logInfo, logError } from "../_shared/logger.ts";

serve(async () => {
  try {
    logInfo("Starting Strava sync");

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, strava_athlete_id");

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      logInfo("No users to sync");
      return new Response(JSON.stringify({ message: "No users to sync" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let totalIngested = 0;

    for (const user of users) {
      if (!user.strava_athlete_id) {
        logInfo("User missing Strava athlete ID", { userId: user.id });
        continue;
      }

      try {
        const accessToken = await getValidAccessToken(user.id);

        // Get last sync time from most recent activity, or default to 7 days ago
        const { data: lastActivity } = await supabaseAdmin
          .from("activities")
          .select("started_at")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        const after = lastActivity
          ? Math.floor(new Date(lastActivity.started_at).getTime() / 1000)
          : Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

        const activities = await fetchAthleteActivities(accessToken, after);

        logInfo("Fetched activities from Strava", {
          userId: user.id,
          count: activities.length,
        });

        for (const act of activities) {
          // Only real runs allowed
          if (act.type !== "Run") continue;

          // Exclude virtual runs
          if (act.sport_type === "VirtualRun") continue;

          // Exclude manual activities
          if (act.manual === true) continue;

          // Must have GPS data
          if (!act.map || !act.map.summary_polyline) continue;

          // Upsert activity (by strava_activity_id)
          const { error: upsertError } = await supabaseAdmin
            .from("activities")
            .upsert(
              {
                user_id: user.id,
                strava_activity_id: act.id,
                activity_type: act.type,
                started_at: act.start_date,
                elapsed_seconds: act.elapsed_time,
                polyline: act.map.summary_polyline,
              },
              {
                onConflict: "strava_activity_id",
                ignoreDuplicates: false,
              }
            );

          if (upsertError) {
            logError("Failed to upsert activity", {
              userId: user.id,
              activityId: act.id,
              error: upsertError,
            });
            continue;
          }

          totalIngested++;
        }
      } catch (err) {
        logError("Failed to sync user activities", {
          userId: user.id,
          error: err,
        });
        // Continue with next user
        continue;
      }
    }

    logInfo("Strava sync completed", { totalIngested });

    return new Response(
      JSON.stringify({ message: "Sync completed", totalIngested }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Strava sync failed", err);
    return new Response(
      JSON.stringify({ error: "Sync failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
