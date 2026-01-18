// src/services/participantService.js
// Purpose: Check if user is a participant in active challenge

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";
import { fetchActiveChallenge } from "./challengeService";

/**
 * Check if current user is a participant in the active challenge
 */
export async function isCurrentUserParticipant() {
  try {
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
 * Join the active challenge (create participant record)
 */
export async function joinActiveChallenge() {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      throw new Error("User must be authenticated to join challenge");
    }

    const challenge = await fetchActiveChallenge();
    if (!challenge) {
      throw new Error("No active challenge found");
    }

    // Check if already a participant
    const existing = await isCurrentUserParticipant();
    if (existing) {
      return { success: true, message: "Already a participant" };
    }

    // Create participant record
    const { data, error } = await supabase
      .from("participants")
      .insert({
        user_id: authUser.id,
        challenge_id: challenge.id,
        excluded: false,
      })
      .select()
      .single();

    if (error) {
      logError("Failed to join challenge", error);
      throw error;
    }

    return { success: true, participant: data };
  } catch (err) {
    logError("Failed to join challenge", err);
    throw err;
  }
}
