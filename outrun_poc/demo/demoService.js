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
 * Note: This requires server-side auth user creation via edge function
 * For now, we skip Supabase writes and work client-side only
 */
export async function createDemoUser() {
  try {
    // For demo mode, we work client-side only
    // The demo user data is stored in localStorage
    // Supabase writes would require proper authentication
    logInfo("Demo user initialized (client-side only)");
    return DEMO_USER;
  } catch (err) {
    logError("Failed to create demo user", err);
    // Don't throw - demo mode should still work client-side
    return DEMO_USER;
  }
}

/**
 * Create demo participant in active challenge
 * Note: Works client-side only for demo mode
 */
export async function createDemoParticipant() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // For demo mode, we work client-side only
    // Store demo participant status in localStorage
    const demoParticipant = {
      user_id: DEMO_USER_ID,
      challenge_id: challenge.id,
      excluded: false,
    };
    
    localStorage.setItem("outrun_demo_participant", JSON.stringify(demoParticipant));
    logInfo("Demo participant initialized (client-side only)");
    return demoParticipant;
  } catch (err) {
    logError("Failed to create demo participant", err);
    // Don't throw - demo mode should still work
    return null;
  }
}

/**
 * Create demo activities (3 runs matching challenge stages)
 * Note: Works client-side only for demo mode
 */
export async function createDemoActivities() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // For demo mode, store activities in localStorage
    const activities = [];
    const now = Date.now();

    // Create 3 activities, one for each stage
    for (let stage = 1; stage <= 3; stage++) {
      const activityDate = getDemoActivityDate(challenge, stage, 1);
      const elapsedSeconds = DEMO_STAGE_TIMES[stage];
      const polyline = DEMO_POLYLINES[stage] || "k~{mHw`|bM";

      activities.push({
        id: `demo-activity-${stage}`,
        user_id: DEMO_USER_ID,
        strava_activity_id: -(now + stage), // Negative ID to mark as demo
        activity_type: "Run",
        started_at: activityDate,
        elapsed_seconds: elapsedSeconds,
        polyline: polyline,
        processed_at: new Date().toISOString(),
      });
    }

    localStorage.setItem("outrun_demo_activities", JSON.stringify(activities));
    logInfo(`Initialized ${activities.length} demo activities (client-side only)`);
    return activities;
  } catch (err) {
    logError("Failed to create demo activities", err);
    // Don't throw - demo mode should still work
    return [];
  }
}

/**
 * Create demo stage results
 * Note: Works client-side only for demo mode
 */
export async function createDemoStageResults() {
  try {
    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // For demo mode, store stage results in localStorage
    const results = [];

    for (let stage = 1; stage <= 3; stage++) {
      const elapsedSeconds = DEMO_STAGE_TIMES[stage];
      const completedAt = getDemoActivityDate(challenge, stage, 1);

      results.push({
        id: `demo-stage-result-${stage}`,
        user_id: DEMO_USER_ID,
        challenge_id: challenge.id,
        stage_number: stage,
        best_time_seconds: elapsedSeconds,
        completed_at: completedAt,
      });
    }

    localStorage.setItem("outrun_demo_stage_results", JSON.stringify(results));
    logInfo(`Initialized ${results.length} demo stage results (client-side only)`);
    return results;
  } catch (err) {
    logError("Failed to create demo stage results", err);
    // Don't throw - demo mode should still work
    return [];
  }
}

/**
 * Initialize all demo data
 * Note: Works client-side only - stores data in localStorage
 */
export async function initializeDemoData() {
  try {
    logInfo("Initializing demo data (client-side only)...");
    
    await createDemoUser();
    await createDemoParticipant();
    await createDemoActivities();
    await createDemoStageResults();
    
    logInfo("Demo data initialization complete");
    return { success: true };
  } catch (err) {
    logError("Failed to initialize demo data", err);
    // Don't throw - return success anyway so demo mode can still work
    return { success: true, warning: "Some demo data may not be available" };
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
