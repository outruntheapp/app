// src/services/authService.js
// Purpose: Handle Strava OAuth and session state

import { logInfo, logError } from "../utils/logger";
import { isDemoMode } from "../utils/demoMode";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";

export async function connectStrava() {
  try {
    // Check if demo mode is enabled
    if (isDemoMode()) {
      logInfo("Demo mode enabled - skipping Strava OAuth");
      alert("Demo mode is enabled. Strava connection is disabled in demo mode.");
      return;
    }

    logInfo("Starting Strava OAuth");

    // Get client ID from environment (public, safe to expose)
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) {
      throw new Error("Strava client ID not configured");
    }

    // Construct Strava OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`;
    const scope = "read,activity:read";
    const responseType = "code";
    const approvalPrompt = "force";

    const authUrl = new URL(STRAVA_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", responseType);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("approval_prompt", approvalPrompt);

    // Redirect to Strava
    window.location.href = authUrl.toString();
  } catch (err) {
    logError("Strava OAuth failed", err);
    throw err;
  }
}
