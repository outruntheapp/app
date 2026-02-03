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
      // Ensure display name: prefer users.full_name, then auth user_metadata, then email local part
      const fullName =
        data?.full_name?.trim() ||
        authUser?.user_metadata?.full_name?.trim() ||
        authUser?.user_metadata?.name?.trim() ||
        (authUser?.email ? authUser.email.replace(/@.*$/, "").trim() : "") ||
        "Runner";
      return data ? { ...data, full_name: fullName } : { id: authUser.id, full_name: fullName };
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
        const merged = data || demoUser;
        const fullName = merged?.full_name?.trim() || demoUser?.full_name || "Runner";
        return merged ? { ...merged, full_name: fullName } : { ...demoUser, full_name: fullName };
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
