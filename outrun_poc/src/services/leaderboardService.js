// src/services/leaderboardService.js
// Purpose: Fetch leaderboard data from Supabase views

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";

export async function fetchOverallLeaderboard() {
  try {
    const { data, error } = await supabase
      .from("leaderboard_overall")
      .select("*");

    if (error) throw error;
    return data;
  } catch (err) {
    logError("Failed to fetch overall leaderboard", err);
    return [];
  }
}
