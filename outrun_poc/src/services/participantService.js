// src/services/participantService.js
// Purpose: Check if user is a participant in active challenge

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";
import { fetchActiveChallenge } from "./challengeService";
import { isDemoMode, getDemoUserId } from "../utils/demoMode";

/**
 * Check if current user is a participant in the active challenge
 */
export async function isCurrentUserParticipant() {
  try {
    // In demo mode, demo user is always a participant
    if (isDemoMode()) {
      return true;
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return false;

    const challenge = await fetchActiveChallenge();
    if (!challenge) return false;

    const { data, error } = await supabase
      .from("participants")
      .select("id, excluded")
      .eq("user_id", authUser.id)
      .eq("challenge_id", challenge.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      logError("Failed to check participant status", error);
      return false;
    }

    return data && !data.excluded;
  } catch (err) {
    logError("Failed to check participant status", err);
    return false;
  }
}

/**
 * Check if a specific user is a participant in a challenge
 */
export async function isUserParticipant(userId, challengeId) {
  try {
    const { data, error } = await supabase
      .from("participants")
      .select("id, excluded")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .single();

    if (error && error.code !== "PGRST116") {
      logError("Failed to check participant status", error);
      return false;
    }

    return data && !data.excluded;
  } catch (err) {
    logError("Failed to check participant status", err);
    return false;
  }
}

/**
 * Join the active challenge
 * For now: Just returns success to reveal Strava button (no Supabase changes)
 * Future: Will handle ticket purchase/validation
 */
export async function joinActiveChallenge() {
  try {
    // In demo mode, demo user is already a participant (created by init-demo-data)
    if (isDemoMode()) {
      return { success: true, message: "Demo user is already a participant" };
    }

    // Just return success - no Supabase operations
    // Strava auth will create user and participant records
    return { success: true };
  } catch (err) {
    logError("Failed to join challenge", err);
    throw err;
  }
}
