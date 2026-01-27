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
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata,
    });
  } catch (err) {
    // Swallow error - audit logging must not block workflow
    console.error("Audit log write failed (non-blocking):", err);
  }
}

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

async function getValidAccessToken(userId: string): Promise<string> {
  const { data: token } = await supabaseAdmin
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!token) throw new Error("Missing Strava token");

  const expiresSoon =
    new Date(token.expires_at).getTime() < Date.now() + 5 * 60 * 1000;

  if (!expiresSoon) {
    return token.access_token;
  }

  const refreshed = await refreshToken(token.refresh_token);

  await supabaseAdmin.from("strava_tokens").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}

async function refreshToken(refreshToken: string) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  return await res.json();
}

async function fetchAthleteActivities(
  accessToken: string,
  after?: number
): Promise<any[]> {
  const url = new URL(`${STRAVA_API_URL}/athlete/activities`);
  if (after) {
    url.searchParams.set("after", after.toString());
  }
  url.searchParams.set("per_page", "200");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status}`);
  }

  return await res.json();
}

// ============================================================================
// Main Function
// ============================================================================

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

      // Log user sync start
      await writeAuditLog({
        actorId: user.id,
        action: "strava.sync.user.start",
        entityType: "user",
        entityId: user.id,
        metadata: { athlete_id: user.strava_athlete_id },
      });

      let userInserted = 0;
      let userSkipped = 0;

      try {
        const accessToken = await getValidAccessToken(user.id);

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

        // Log activities fetched
        await writeAuditLog({
          actorId: user.id,
          action: "strava.sync.activities.fetched",
          entityType: "user",
          entityId: user.id,
          metadata: { count: activities.length },
        });

        for (const act of activities) {
          if (act.type !== "Run") {
            userSkipped++;
            await writeAuditLog({
              actorId: user.id,
              action: "activity.skipped",
              entityType: "activity",
              metadata: { reason: "not_run", strava_activity_id: act.id },
            });
            continue;
          }
          if (act.sport_type === "VirtualRun") {
            userSkipped++;
            await writeAuditLog({
              actorId: user.id,
              action: "activity.skipped",
              entityType: "activity",
              metadata: { reason: "virtual", strava_activity_id: act.id },
            });
            continue;
          }
          if (act.manual === true) {
            userSkipped++;
            await writeAuditLog({
              actorId: user.id,
              action: "activity.skipped",
              entityType: "activity",
              metadata: { reason: "manual", strava_activity_id: act.id },
            });
            continue;
          }
          if (!act.map || !act.map.summary_polyline) {
            userSkipped++;
            await writeAuditLog({
              actorId: user.id,
              action: "activity.skipped",
              entityType: "activity",
              metadata: { reason: "no_polyline", strava_activity_id: act.id },
            });
            continue;
          }

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

          // Get activity ID for audit log
          const { data: activity } = await supabaseAdmin
            .from("activities")
            .select("id")
            .eq("strava_activity_id", act.id)
            .single();

          // Log activity inserted
          if (activity) {
            await writeAuditLog({
              actorId: user.id,
              action: "activity.inserted",
              entityType: "activity",
              entityId: activity.id,
              metadata: { strava_activity_id: act.id },
            });
            userInserted++;
            totalIngested++;
          }
        }

        // Log user sync complete
        await writeAuditLog({
          actorId: user.id,
          action: "strava.sync.user.complete",
          entityType: "user",
          entityId: user.id,
          metadata: { inserted: userInserted, skipped: userSkipped },
        });
      } catch (err) {
        logError("Failed to sync user activities", {
          userId: user.id,
          error: err,
        });
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
