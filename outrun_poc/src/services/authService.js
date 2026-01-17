// src/services/authService.js
// Purpose: Handle Strava OAuth and session state

import { supabase } from "./supabaseClient";
import { logInfo, logError } from "../utils/logger";

export async function connectStrava() {
  try {
    logInfo("Starting Strava OAuth");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "strava",
      options: {
        scopes: "activity:read",
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
  } catch (err) {
    logError("Strava OAuth failed", err);
    throw err;
  }
}
