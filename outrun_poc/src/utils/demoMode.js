// src/utils/demoMode.js
// Purpose: Demo mode utilities to bypass Strava auth for development/testing

import { DEMO_USER_ID, DEMO_USER } from "../../demo/demoData";
import { initializeDemoData, getDemoAuthSession } from "../../demo/demoService";
import { supabase } from "../services/supabaseClient";

const DEMO_MODE_KEY = "outrun_demo_mode";
const DEMO_USER_KEY = "outrun_demo_user";

/**
 * Check if demo mode is enabled
 */
export function isDemoMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

/**
 * Enable demo mode and initialize demo data
 * Creates demo data in Supabase and establishes auth session
 */
export async function enableDemoMode() {
  if (typeof window === "undefined") return;
  
  try {
    // Set demo mode flag first
    localStorage.setItem(DEMO_MODE_KEY, "true");
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER));
    
    // Initialize demo data in Supabase via edge function
    await initializeDemoData();
    
    // Get demo auth session and sign in
    const sessionResult = await getDemoAuthSession();
    
    if (!sessionResult.success) {
      throw new Error("Failed to establish demo auth session");
    }
    
    return { success: true };
  } catch (err) {
    console.error("Failed to enable demo mode", err);
    // Still set localStorage so UI shows demo mode is on
    localStorage.setItem(DEMO_MODE_KEY, "true");
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER));
    return { success: false, error: err };
  }
}

/**
 * Disable demo mode
 */
export async function disableDemoMode() {
  if (typeof window === "undefined") return;
  
  // Sign out the demo user
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Failed to sign out demo user", err);
  }
  
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem(DEMO_USER_KEY);
}

/**
 * Get demo user if demo mode is enabled
 * Tries to fetch from Supabase first, falls back to localStorage/default
 */
export async function getDemoUser() {
  if (!isDemoMode()) return null;
  
  try {
    // Try to fetch demo user from Supabase
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", DEMO_USER_ID)
      .single();
    
    if (data) {
      return data;
    }
  } catch (err) {
    // If fetch fails, fall back to localStorage/default
    console.warn("Failed to fetch demo user from Supabase, using fallback", err);
  }
  
  // Fallback to localStorage or default
  const demoUserStr = localStorage.getItem(DEMO_USER_KEY);
  if (demoUserStr) {
    try {
      return JSON.parse(demoUserStr);
    } catch {
      return DEMO_USER; // Fallback to default demo user
    }
  }
  
  return DEMO_USER; // Final fallback
}

/**
 * Get demo user ID
 */
export function getDemoUserId() {
  return DEMO_USER_ID;
}
