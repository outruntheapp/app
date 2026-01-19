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

// ============================================================================
// Main Function
// ============================================================================

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
const DEMO_USER_EMAIL = "demo@outrun.local";
const DEMO_USER_NAME = "Demo Runner";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logInfo("Initializing demo data");

    // Get active challenge
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .single();

    if (challengeError || !challenge) {
      logError("No active challenge found", challengeError);
      return new Response(
        JSON.stringify({ error: "No active challenge found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create or get demo user in Supabase Auth
    let demoAuthUser;
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const foundUser = existingAuthUser?.users?.find((u) => u.id === DEMO_USER_ID || u.email === DEMO_USER_EMAIL);

    if (foundUser) {
      demoAuthUser = foundUser;
      logInfo("Demo auth user already exists", { userId: demoAuthUser.id });
    } else {
      // Create demo user with a known password for easy sign-in
      const DEMO_PASSWORD = Deno.env.get("DEMO_USER_PASSWORD") || "demo-password-123";
      
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        email_confirm: true,
        password: DEMO_PASSWORD,
        user_metadata: {
          full_name: DEMO_USER_NAME,
          is_demo: true,
        },
      });

      if (authError || !newUser?.user) {
        throw new Error(`Failed to create demo auth user: ${authError?.message}`);
      }

      demoAuthUser = newUser.user;
      logInfo("Created demo auth user", { userId: demoAuthUser.id });
    }

    // 2. Create or update user record in users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", DEMO_USER_ID)
      .single();

    if (existingUser) {
      logInfo("Demo user record already exists");
    } else {
      const { error: userError } = await supabaseAdmin.from("users").insert({
        id: DEMO_USER_ID,
        full_name: DEMO_USER_NAME,
        strava_athlete_id: null,
        sex: null,
      });

      if (userError) {
        throw new Error(`Failed to create user record: ${userError.message}`);
      }
      logInfo("Created demo user record");
    }

    // 3. Create participant record
    const { data: existingParticipant } = await supabaseAdmin
      .from("participants")
      .select("*")
      .eq("user_id", DEMO_USER_ID)
      .eq("challenge_id", challenge.id)
      .single();

    if (existingParticipant) {
      logInfo("Demo participant already exists");
    } else {
      const { error: participantError } = await supabaseAdmin.from("participants").insert({
        user_id: DEMO_USER_ID,
        challenge_id: challenge.id,
        excluded: false,
      });

      if (participantError) {
        throw new Error(`Failed to create participant: ${participantError.message}`);
      }
      logInfo("Created demo participant");
    }

    // 4. Create demo activities (3 runs, one per stage)
    const now = Date.now();
    const activities = [];
    const stageTimes = { 1: 3600, 2: 4200, 3: 3900 }; // 1h, 1h10m, 1h5m
    const polylines = {
      1: "k~{mHw`|bM",
      2: "k~{mHw`|bN",
      3: "k~{mHw`|bO",
    };

    // Get existing activities to avoid duplicates
    const { data: existingActivities } = await supabaseAdmin
      .from("activities")
      .select("strava_activity_id")
      .eq("user_id", DEMO_USER_ID);

    const existingActivityIds = new Set(
      existingActivities?.map((a) => a.strava_activity_id) || []
    );

    for (let stage = 1; stage <= 3; stage++) {
      const activityId = -(now + stage); // Negative ID to mark as demo
      
      if (existingActivityIds.has(activityId)) {
        logInfo(`Demo activity for stage ${stage} already exists`);
        continue;
      }

      const activityDate = new Date(challenge.starts_at);
      activityDate.setDate(activityDate.getDate() + stage); // Day 1, 2, 3 after start

      const { data: activity, error: activityError } = await supabaseAdmin
        .from("activities")
        .insert({
          user_id: DEMO_USER_ID,
          strava_activity_id: activityId,
          activity_type: "Run",
          started_at: activityDate.toISOString(),
          elapsed_seconds: stageTimes[stage],
          polyline: polylines[stage],
          processed_at: new Date().toISOString(), // Mark as processed
        })
        .select()
        .single();

      if (activityError) {
        logError(`Failed to create activity for stage ${stage}`, activityError);
        continue;
      }

      activities.push(activity);
    }

    logInfo(`Created ${activities.length} demo activities`);

    // 5. Create demo stage results (stages 1 and 2 completed, stage 3 pending)
    const stageResults = [];
    const completedStages = [1, 2]; // As per spec: 1-2 completed

    for (let stage = 1; stage <= 3; stage++) {
      if (!completedStages.includes(stage)) {
        continue; // Skip stage 3 (not completed)
      }

      const { data: existingResult } = await supabaseAdmin
        .from("stage_results")
        .select("*")
        .eq("user_id", DEMO_USER_ID)
        .eq("challenge_id", challenge.id)
        .eq("stage_number", stage)
        .single();

      if (existingResult) {
        logInfo(`Demo stage result for stage ${stage} already exists`);
        continue;
      }

      const activityDate = new Date(challenge.starts_at);
      activityDate.setDate(activityDate.getDate() + stage);

      const { data: result, error: resultError } = await supabaseAdmin
        .from("stage_results")
        .insert({
          user_id: DEMO_USER_ID,
          challenge_id: challenge.id,
          stage_number: stage,
          best_time_seconds: stageTimes[stage],
          completed_at: activityDate.toISOString(),
        })
        .select()
        .single();

      if (resultError) {
        logError(`Failed to create stage result for stage ${stage}`, resultError);
        continue;
      }

      stageResults.push(result);
    }

    logInfo(`Created ${stageResults.length} demo stage results`);

    // 6. Create additional demo users for realistic leaderboard (2-3 other users)
    const additionalDemoUsers = [
      { 
        id: "11111111-1111-1111-1111-111111111111",
        name: "Fast Runner", 
        times: { 1: 3300, 2: 3800, 3: 3500 },
        email: "fast-runner@outrun.local"
      },
      { 
        id: "22222222-2222-2222-2222-222222222222",
        name: "Steady Runner", 
        times: { 1: 3900, 2: 4500, 3: 4200 },
        email: "steady-runner@outrun.local"
      },
    ];

    for (const additionalUser of additionalDemoUsers) {
      // Check if user exists
      const { data: existingAddUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", additionalUser.id)
        .single();

      if (!existingAddUser) {
        // Create auth user
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          id: additionalUser.id,
          email: additionalUser.email,
          email_confirm: true,
          user_metadata: { full_name: additionalUser.name, is_demo: true },
        });

        if (!authErr && authUser?.user) {
          // Create user record
          await supabaseAdmin.from("users").insert({
            id: additionalUser.id,
            full_name: additionalUser.name,
            strava_athlete_id: null,
            sex: null,
          });

          // Create participant
          await supabaseAdmin.from("participants").insert({
            user_id: additionalUser.id,
            challenge_id: challenge.id,
            excluded: false,
          });

          // Create stage results for completed stages (1 and 2)
          for (let stage = 1; stage <= 2; stage++) {
            const activityDate = new Date(challenge.starts_at);
            activityDate.setDate(activityDate.getDate() + stage);

            await supabaseAdmin.from("stage_results").insert({
              user_id: additionalUser.id,
              challenge_id: challenge.id,
              stage_number: stage,
              best_time_seconds: additionalUser.times[stage],
              completed_at: activityDate.toISOString(),
            });
          }
          
          logInfo(`Created additional demo user: ${additionalUser.name}`);
        }
      }
    }

    logInfo("Demo data initialization complete");

    return new Response(
      JSON.stringify({
        success: true,
        userId: DEMO_USER_ID,
        message: "Demo data initialized",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Failed to initialize demo data", err);
    return new Response(
      JSON.stringify({ error: "Failed to initialize demo data", details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
