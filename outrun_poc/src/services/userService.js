// src/services/userService.js
// Purpose: Fetch current user data

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";
import { isDemoMode, getDemoUser } from "../utils/demoMode";
import { DEMO_USER_ID } from "../../demo/demoData";

export async function fetchCurrentUser() {
  try {
    // Prioritize real auth user: if signed in and not demo user, show that user only
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser && authUser.id !== DEMO_USER_ID) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (error) throw error;
      return data;
    }

    // Otherwise use demo user only when demo mode is on
    if (isDemoMode()) {
      const demoUser = await getDemoUser();
      if (demoUser) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", demoUser.id)
          .single();
        return data || demoUser;
      }
    }

    return null;
  } catch (err) {
    logError("Failed to fetch current user", err);
    return null;
  }
}

export async function fetchUserStageResults(userId, challengeId) {
  try {
    const { data, error } = await supabase
      .from("stage_results")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challengeId)
      .order("stage_number", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    logError("Failed to fetch user stage results", err);
    return [];
  }
}

export async function fetchUserRank(userId, challengeId) {
  try {
    // Get overall leaderboard and find user's position
    const { data: leaderboard, error } = await supabase
      .from("leaderboard_overall")
      .select("*")
      .order("total_time_seconds", { ascending: true });

    if (error) throw error;

    const userIndex = leaderboard?.findIndex((entry) => entry.user_id === userId) ?? -1;
    return userIndex >= 0 ? userIndex + 1 : null;
  } catch (err) {
    logError("Failed to fetch user rank", err);
    return null;
  }
}
