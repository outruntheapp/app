// src/services/activityService.js
// Purpose: Trigger backend sync and fetch user activity state

import { supabase } from "./supabaseClient";
import { logDebug, logError } from "../utils/logger";

export async function fetchMyActivities() {
  try {
    logDebug("Fetching user activities");

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("start_time", { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    logError("Failed to fetch activities", err);
    return [];
  }
}
