// demo/demoService.js
// Purpose: Service to create and manage demo data in Supabase

import { supabase } from "../src/services/supabaseClient";
import { DEMO_USER_ID, DEMO_USER, DEMO_STAGE_TIMES, DEMO_POLYLINES, getDemoActivityDate } from "./demoData";
import { fetchActiveChallenge } from "../src/services/challengeService";
import { logError } from "../src/utils/logger";

// Simple logging for demo service (since logger might not be available)
function logInfo(message, meta = {}) {
  console.log(`[Demo Service] ${message}`, meta);
}

/**
 * Create demo user in Supabase Auth and users table
 */
export async function createDemoUser() {
  try {
    // Check if demo user already exists in users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", DEMO_USER_ID)
      .single();

    if (existingUser) {
      logInfo("Demo user already exists");
      return existingUser;
    }

    // Note: We can't create auth users from the client side
    // Demo user will be created server-side or we use a special approach
    // For now, we'll just create the user record
    // In production, you'd need an edge function to create the auth user
    
    const { data, error } = await supabase
      .from("users")
      .insert({
        id: DEMO_USER_ID,
        full_name: DEMO_USER.full_name,
        strava_athlete_id: null,
        sex: null,
      })
      .select()
      .single();

    if (error && error.code !== "23505") { // 23505 = unique violation (already exists)
      logError("Failed to create demo user", error);
      throw error;
    }

    logInfo("Demo user created or already exists");
    return data || existingUser;
  } catch (err) {
    logError("Failed to create demo user", err);
    throw err;
  }
}

/**
 * Create demo participant in active challenge
 */
export async function createDemoParticipant() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // Check if demo participant already exists
    const { data: existing } = await supabase
      .from("participants")
      .select("*")
      .eq("user_id", DEMO_USER_ID)
      .eq("challenge_id", challenge.id)
      .single();

    if (existing) {
      logInfo("Demo participant already exists");
      return existing;
    }

    const { data, error } = await supabase
      .from("participants")
      .insert({
        user_id: DEMO_USER_ID,
        challenge_id: challenge.id,
        excluded: false,
      })
      .select()
      .single();

    if (error) {
      logError("Failed to create demo participant", error);
      throw error;
    }

    logInfo("Demo participant created");
    return data;
  } catch (err) {
    logError("Failed to create demo participant", err);
    throw err;
  }
}

/**
 * Create demo activities (3 runs matching challenge stages)
 */
export async function createDemoActivities() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // Check if demo activities already exist
    const { data: existing } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", DEMO_USER_ID)
      .limit(1);

    if (existing && existing.length > 0) {
      logInfo("Demo activities already exist");
      return existing;
    }

    const activities = [];
    const now = Date.now();

    // Create 3 activities, one for each stage
    for (let stage = 1; stage <= 3; stage++) {
      const activityDate = getDemoActivityDate(challenge, stage, 1);
      const elapsedSeconds = DEMO_STAGE_TIMES[stage];
      
      // Use a simple encoded polyline (you can replace with actual GPX-derived polylines)
      // For demo, we use a minimal valid polyline
      const polyline = DEMO_POLYLINES[stage] || "k~{mHw`|bM";

      const { data, error } = await supabase
        .from("activities")
        .insert({
          user_id: DEMO_USER_ID,
          strava_activity_id: -(now + stage), // Negative ID to mark as demo
          activity_type: "Run",
          started_at: activityDate,
          elapsed_seconds: elapsedSeconds,
          polyline: polyline,
          processed_at: new Date().toISOString(), // Mark as processed
        })
        .select()
        .single();

      if (error) {
        logError(`Failed to create demo activity for stage ${stage}`, error);
        continue;
      }

      activities.push(data);
    }

    logInfo(`Created ${activities.length} demo activities`);
    return activities;
  } catch (err) {
    logError("Failed to create demo activities", err);
    throw err;
  }
}

/**
 * Create demo stage results
 */
export async function createDemoStageResults() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // Check if demo stage results already exist
    const { data: existing } = await supabase
      .from("stage_results")
      .select("id")
      .eq("user_id", DEMO_USER_ID)
      .eq("challenge_id", challenge.id)
      .limit(1);

    if (existing && existing.length > 0) {
      logInfo("Demo stage results already exist");
      return existing;
    }

    const results = [];

    for (let stage = 1; stage <= 3; stage++) {
      const elapsedSeconds = DEMO_STAGE_TIMES[stage];
      const completedAt = getDemoActivityDate(challenge, stage, 1);

      const { data, error } = await supabase
        .from("stage_results")
        .upsert({
          user_id: DEMO_USER_ID,
          challenge_id: challenge.id,
          stage_number: stage,
          best_time_seconds: elapsedSeconds,
          completed_at: completedAt,
        }, {
          onConflict: "user_id,challenge_id,stage_number",
        })
        .select()
        .single();

      if (error) {
        logError(`Failed to create demo stage result for stage ${stage}`, error);
        continue;
      }

      results.push(data);
    }

    logInfo(`Created ${results.length} demo stage results`);
    return results;
  } catch (err) {
    logError("Failed to create demo stage results", err);
    throw err;
  }
}

/**
 * Initialize all demo data
 */
export async function initializeDemoData() {
  try {
    logInfo("Initializing demo data...");
    
    await createDemoUser();
    await createDemoParticipant();
    await createDemoActivities();
    await createDemoStageResults();
    
    logInfo("Demo data initialization complete");
    return { success: true };
  } catch (err) {
    logError("Failed to initialize demo data", err);
    throw err;
  }
}

/**
 * Clean up demo data (for testing/reset)
 */
export async function cleanupDemoData() {
  try {
    const challenge = await fetchActiveChallenge();
    
    // Delete in order to respect foreign key constraints
    if (challenge) {
      await supabase
        .from("stage_results")
        .delete()
        .eq("user_id", DEMO_USER_ID)
        .eq("challenge_id", challenge.id);
    }

    await supabase
      .from("activities")
      .delete()
      .eq("user_id", DEMO_USER_ID);

    if (challenge) {
      await supabase
        .from("participants")
        .delete()
        .eq("user_id", DEMO_USER_ID)
        .eq("challenge_id", challenge.id);
    }

    // Note: We don't delete the user record as it might be referenced elsewhere
    // In production, you'd want a more comprehensive cleanup

    logInfo("Demo data cleaned up");
    return { success: true };
  } catch (err) {
    logError("Failed to cleanup demo data", err);
    throw err;
  }
}
