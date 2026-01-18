// src/utils/demoMode.js
// Purpose: Demo mode utilities to bypass Strava auth for development/testing

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
 * Enable demo mode
 */
export function enableDemoMode() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_MODE_KEY, "true");
  
  // Create a demo user object
  const demoUser = {
    id: "demo-user-id",
    full_name: "Demo Runner",
    strava_athlete_id: null,
    is_demo: true,
  };
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
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
    return null;
  }
}
