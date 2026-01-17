// src/services/leaderboardService.js
// Purpose: Fetch leaderboard data from Supabase views

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";

export async function fetchOverallLeaderboard() {
  try {
    const { data, error } = await supabase
      .from("leaderboard_overall")
      .select("*")
      .order("total_time_seconds", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    logError("Failed to fetch overall leaderboard", err);
    return [];
  }
}

export async function fetchStageLeaderboard(stageNumber) {
  try {
    const { data, error } = await supabase
      .from("leaderboard_stage")
      .select("*")
      .eq("stage_number", stageNumber)
      .order("best_time_seconds", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    logError("Failed to fetch stage leaderboard", err);
    return [];
  }
}
