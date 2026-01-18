// demo/demoData.js
// Purpose: Demo data constants and utilities

// Demo user ID (consistent across sessions)
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

// Demo user data
export const DEMO_USER = {
  id: DEMO_USER_ID,
  full_name: "Demo Runner",
  strava_athlete_id: null,
  is_demo: true,
};

// Average completion times for challenge_1 stages (in seconds)
// These are realistic average times for the routes
export const DEMO_STAGE_TIMES = {
  1: 3600,  // 1 hour for stage 1
  2: 4200,  // 1 hour 10 minutes for stage 2
  3: 3900,  // 1 hour 5 minutes for stage 3
};

// Demo activity data - simplified polylines for each stage
// These are minimal encoded polylines for demo purposes
// In production, these would be derived from the actual GPX files
// Format: Google Maps encoded polyline (simplified for demo)
export const DEMO_POLYLINES = {
  1: "k~{mHw`|bM",  // Simple demo polyline for stage 1
  2: "k~{mHw`|bN",  // Simple demo polyline for stage 2  
  3: "k~{mHw`|bO",  // Simple demo polyline for stage 3
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
