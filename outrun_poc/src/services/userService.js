// src/services/userService.js
// Purpose: Fetch current user data

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";
import { isDemoMode, getDemoUser } from "../utils/demoMode";
import { DEMO_USER_ID } from "../../demo/demoData";

export async function fetchCurrentUser() {
  try {
    // Use session from storage first (reliable on load), then fallback to getUser()
    const { data: { session } } = await supabase.auth.getSession();
    let authUser = session?.user;
    if (!authUser) {
      const { data: { user } } = await supabase.auth.getUser();
      authUser = user;
    }

    if (authUser && authUser.id !== DEMO_USER_ID) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      // No row (e.g. magic-link user without public.users) -> build synthetic user
      const identityName =
        authUser?.user_metadata?.full_name?.trim() ||
        authUser?.user_metadata?.name?.trim() ||
        authUser?.user_metadata?.user_name?.trim() ||
        (authUser?.identities?.[0]?.identity_data?.full_name ||
          authUser?.identities?.[0]?.identity_data?.name)?.trim?.() ||
        "";
      const emailPart =
        authUser?.email && !authUser.email.includes("@strava.local")
          ? authUser.email.replace(/@.*$/, "").trim()
          : "";
      const fallbackName = identityName || emailPart || "Runner";
      if (error) {
        if (error.code === "PGRST116") {
          return { id: authUser.id, full_name: fallbackName };
        }
        throw error;
      }
      const fullName =
        data?.full_name?.trim() ||
        (data?.email && !String(data.email).includes("strava.local") ? data.email.replace(/@.*$/, "").trim() : "") ||
        identityName ||
        emailPart ||
        "Runner";
      return { ...data, full_name: fullName };
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
