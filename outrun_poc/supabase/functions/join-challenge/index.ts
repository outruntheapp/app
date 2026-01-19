// supabase/functions/join-challenge/index.ts
// Purpose: Create user and participant records when user joins challenge
// For now: Creates anonymous user and participant, reveals Strava connect button
// Future: Will handle ticket purchase/validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { logInfo, logError } from "../_shared/logger.ts";

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
    logInfo("Processing join challenge request");

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

    // Generate a unique temporary email for anonymous user
    const tempEmail = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}@outrun.local`;
    
    // Create anonymous user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      email_confirm: true,
      user_metadata: {
        is_temporary: true,
        joined_at: new Date().toISOString(),
      },
    });

    if (authError || !authUser?.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    const userId = authUser.user.id;
    logInfo("Created temporary auth user", { userId });

    // Create user record in users table
    const { error: userError } = await supabaseAdmin.from("users").insert({
      id: userId,
      full_name: null, // Will be set when Strava is connected
      strava_athlete_id: null,
      sex: null,
    });

    if (userError) {
      // Clean up auth user if user creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create user record: ${userError.message}`);
    }

    logInfo("Created user record", { userId });

    // Check if already a participant
    const { data: existingParticipant } = await supabaseAdmin
      .from("participants")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .single();

    if (existingParticipant) {
      logInfo("User already a participant", { userId });
      return new Response(
        JSON.stringify({
          success: true,
          userId,
          message: "Already a participant",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create participant record
    const { data: participant, error: participantError } = await supabaseAdmin
      .from("participants")
      .insert({
        user_id: userId,
        challenge_id: challenge.id,
        excluded: false,
      })
      .select()
      .single();

    if (participantError) {
      logError("Failed to create participant", participantError);
      throw new Error(`Failed to create participant: ${participantError.message}`);
    }

    logInfo("Created participant record", { userId, challengeId: challenge.id });

    // Return success with user ID
    // Client will store this and use it when connecting Strava
    return new Response(
      JSON.stringify({
        success: true,
        userId,
        participant,
        message: "Successfully joined challenge",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Failed to join challenge", err);
    return new Response(
      JSON.stringify({ error: "Failed to join challenge", details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
