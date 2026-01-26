// demo/demoData.js
// Purpose: Demo data constants and utilities

// Demo user ID (consistent across sessions)
// Use a valid UUID instead of nil UUID (Supabase doesn't allow nil UUIDs)
export const DEMO_USER_ID = "aaaaaaaa-0000-0000-0000-000000000000";

// Demo Strava athlete ID (simulates real Strava athlete)
export const DEMO_STRAVA_ATHLETE_ID = 999999999;

// Demo user data
export const DEMO_USER = {
  id: DEMO_USER_ID,
  full_name: "Demo Runner",
  strava_athlete_id: DEMO_STRAVA_ATHLETE_ID,
  is_demo: true,
};

// Average completion times for challenge_1 stages (in seconds)
// These are realistic average times for the routes
export const DEMO_STAGE_TIMES = {
  1: 3600,  // 1 hour for stage 1
  2: 4200,  // 1 hour 10 minutes for stage 2
  3: 3900,  // 1 hour 5 minutes for stage 3
};

// Demo activity data - fallback polylines when API/GPX not used
// Prefer route-matching polylines from generate-demo-polylines.js / GET /api/demo-polylines
// so demo activities match routes in match_activity_to_route. Format: Google encoded polyline.
export const DEMO_POLYLINES = {
  1: "k~{mHw`|bM",  // Placeholder for stage 1
  2: "k~{mHw`|bN",  // Placeholder for stage 2
  3: "k~{mHw`|bO",  // Placeholder for stage 3
};

// Generate demo activity dates (within challenge window)
export function getDemoActivityDate(challenge, stageNumber, daysOffset = 0) {
  if (!challenge || !challenge.starts_at) {
    const now = new Date();
    return new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000).toISOString();
  }
  
  const startDate = new Date(challenge.starts_at);
  const activityDate = new Date(startDate.getTime() + (daysOffset + stageNumber) * 24 * 60 * 60 * 1000);
  return activityDate.toISOString();
}
