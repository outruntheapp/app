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

    // Check if user has a temporary user ID from joining challenge
    const tempUserId = typeof window !== "undefined" ? localStorage.getItem("outrun_temp_user_id") : null;
    
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // Use auth user ID if available, otherwise use temp user ID
    const userId = authUser?.id || tempUserId;
    
    if (!userId) return false;

    const challenge = await fetchActiveChallenge();
    if (!challenge) return false;

    const { data, error } = await supabase
      .from("participants")
      .select("id, excluded")
      .eq("user_id", userId)
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
 * For now: Creates anonymous user and participant via edge function, reveals Strava connect button
 * Future: Will handle ticket purchase/validation
 */
export async function joinActiveChallenge() {
  try {
    // In demo mode, demo user is already a participant (created by init-demo-data)
    if (isDemoMode()) {
      return { success: true, message: "Demo user is already a participant" };
    }

    // Call edge function to create user and participant
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or anon key not configured");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/join-challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to join challenge: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Failed to join challenge");
    }

    // Store the user ID in localStorage so we can use it later
    // When user connects Strava, we'll update this user record
    if (data.userId) {
      localStorage.setItem("outrun_temp_user_id", data.userId);
    }

    return { success: true, participant: data.participant, userId: data.userId };
  } catch (err) {
    logError("Failed to join challenge", err);
    throw err;
  }
}
