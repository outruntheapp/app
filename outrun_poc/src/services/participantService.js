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
 * Join the active challenge (insert participant row for current user + active challenge).
 * Calls POST /api/join-active-challenge with session token.
 */
export async function joinActiveChallenge() {
  try {
    // In demo mode, demo user is already a participant (created by init-demo-data)
    if (isDemoMode()) {
      return { success: true, message: "Demo user is already a participant" };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: "Not signed in" };
    }

    const base = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL || "";
    const res = await fetch(`${base}/api/join-active-challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.error || res.statusText, code: body.code };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, joined: data.joined };
  } catch (err) {
    logError("Failed to join challenge", err);
    throw err;
  }
}
