# Demo Mode Guide

## Overview
Demo mode allows developers to test the app without requiring Strava API approval or authentication. This is useful for:
- Testing UI components
- Viewing dashboard and leaderboard pages
- Development before Strava API is approved

## How to Enable Demo Mode

### In Development
1. Navigate to the landing page (`/`)
2. Click the "Enable Demo Mode" button (only visible in development)
3. The app will reload and you'll be in demo mode

### Programmatically
```javascript
import { enableDemoMode, isDemoMode, getDemoUser } from "../utils/demoMode";

// Enable demo mode
enableDemoMode();

// Check if demo mode is active
if (isDemoMode()) {
  const demoUser = getDemoUser();
  // Use demoUser for testing
}
```

## Demo User Data
When demo mode is enabled, a demo user is created with:
- `id`: "demo-user-id"
- `full_name`: "Demo Runner"
- `strava_athlete_id`: null
- `is_demo`: true

## Limitations
- Demo mode does not connect to Strava
- No real activity data will be synced
- Some features requiring real Strava data may not work
- Demo mode is stored in localStorage and persists across page reloads

## Disabling Demo Mode
- Click "Disable Demo Mode" button on landing page
- Or call `disableDemoMode()` programmatically
- Or clear localStorage manually

## Integration Points
To use demo mode in other parts of the app:

```javascript
import { isDemoMode, getDemoUser } from "../utils/demoMode";
import { fetchCurrentUser } from "../services/userService";

async function getUser() {
  if (isDemoMode()) {
    return getDemoUser();
  }
  return await fetchCurrentUser();
}
```
