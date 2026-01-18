// src/utils/demoMode.js
// Purpose: Demo mode utilities to bypass Strava auth for development/testing

import { DEMO_USER_ID, DEMO_USER } from "../../demo/demoData";
import { initializeDemoData } from "../../demo/demoService";

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
 */
export async function enableDemoMode() {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(DEMO_MODE_KEY, "true");
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER));
    
    // Initialize demo data in Supabase
    await initializeDemoData();
    
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
export function disableDemoMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem(DEMO_USER_KEY);
}

/**
 * Get demo user if demo mode is enabled
 */
export function getDemoUser() {
  if (!isDemoMode()) return null;
  const demoUserStr = localStorage.getItem(DEMO_USER_KEY);
  if (!demoUserStr) return null;
  try {
    return JSON.parse(demoUserStr);
  } catch {
    return DEMO_USER; // Fallback to default demo user
  }
}

/**
 * Get demo user ID
 */
export function getDemoUserId() {
  return DEMO_USER_ID;
}
