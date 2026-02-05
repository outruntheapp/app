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
- `id`: "aaaaaaaa-0000-0000-0000-000000000000"
- `full_name`: "Demo Runner"
- `strava_athlete_id`: 999999999 (demo Strava athlete ID)
- `email`: "demo@outrun.local"
- `is_demo`: true

## How Demo Mode Works
Demo mode simulates the full OAuth flow:
1. When "Connect with Strava" is clicked in demo mode, it redirects to the OAuth callback with a demo code
2. The callback detects demo mode and uses mock Strava athlete data instead of calling the real Strava API
3. The same callback logic runs as in production, ensuring demo mode mirrors real behavior
4. Demo user is created/updated with demo Strava athlete ID (999999999)

## Limitations
- Demo mode uses mock Strava data (no real API calls)
- No real activity data will be synced
- Demo mode is stored in localStorage and persists across page reloads
- Demo mode fully simulates OAuth flow for testing purposes

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
