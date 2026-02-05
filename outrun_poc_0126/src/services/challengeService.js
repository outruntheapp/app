// src/services/challengeService.js
// Purpose: Fetch challenge data

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";

export async function fetchActiveChallenge() {
  try {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data || null;
  } catch (err) {
    logError("Failed to fetch active challenge", err);
    return null;
  }
}

export function calculateDaysRemaining(challenge) {
  if (!challenge || !challenge.ends_at) return null;
  const now = new Date();
  const endDate = new Date(challenge.ends_at);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}
