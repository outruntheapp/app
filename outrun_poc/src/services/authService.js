// src/services/authService.js
// Purpose: Handle Strava OAuth and session state

import { logInfo, logError } from "../utils/logger";
import { isDemoMode } from "../utils/demoMode";
import { supabase } from "./supabaseClient";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const USER_EMAIL_STORAGE_KEY = "outrun_user_email";

/**
 * Check if a user with the given email has Strava connected
 * Uses secure RPC function to bypass RLS restrictions
 * @param {string} email - User's email address
 * @returns {Promise<{hasStrava: boolean, userId: string | null}>}
 */
export async function checkStravaConnectionByEmail(email) {
  try {
    if (!email || typeof email !== "string") {
      return { hasStrava: false, userId: null };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Use RPC function to avoid RLS violations
    const { data, error } = await supabase.rpc("check_strava_connection_by_email", {
      user_email: trimmedEmail,
    });

    if (error) {
      logError("Failed to check Strava connection via RPC", error);

      // If RPC function doesn't exist, provide helpful error message
      if (error.code === '42883' || error.message?.includes('does not exist') || error.message?.includes('function')) {
        console.error('RPC function check_strava_connection_by_email does not exist. Please apply migration 04_check_strava_by_email.sql to your Supabase database.');
      }
      
      return { hasStrava: false, userId: null };
    }

    if (!data) {
      return { hasStrava: false, userId: null };
    }

    // Parse JSONB result from RPC
    const result = {
      hasStrava: data.hasStrava === true,
      userId: data.userId || null,
    };
    return result;
  } catch (err) {
    logError("Failed to check Strava connection by email", err);
    return { hasStrava: false, userId: null };
  }
}

/**
 * Get the auth email for a user by their provided email
 * Note: This requires an edge function since we can't access auth.admin from client
 * For now, we'll just redirect and let the dashboard handle auth
 * @param {string} email - User's email address
 * @returns {Promise<string | null>} - Auth email (strava_{id}@strava.local) or null
 */
export async function getAuthEmailByUserEmail(email) {
  try {
    if (!email || typeof email !== "string") {
      return null;
    }

    // For MVP, we can't easily get auth email client-side
    // The dashboard will handle authentication
    // In future, we could create an edge function to look this up
    return null;
  } catch (err) {
    logError("Failed to get auth email by user email", err);
    return null;
  }
}

export async function connectStrava(email = null) {
  try {
    // Check if demo mode is enabled
    if (isDemoMode()) {
      logInfo("Demo mode enabled - simulating Strava OAuth");
      
      // Store email in localStorage if provided
      if (email) {
        localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
      }
      
      // Simulate OAuth by calling callback with demo code
      // This ensures demo mode goes through the same flow as real OAuth
      const demoCode = `demo_code_${Date.now()}`;
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`;
      
      // Redirect to callback with demo code
      window.location.href = `${redirectUri}?code=${demoCode}`;
      return;
    }

    logInfo("Starting Strava OAuth", { email: email ? "provided" : "none" });

    // Store email in localStorage if provided
    if (email) {
      localStorage.setItem(USER_EMAIL_STORAGE_KEY, email);
    }

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

/**
 * Clear stored user email from localStorage
 */
export function clearStoredEmail() {
  localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
}

/**
 * Get stored user email from localStorage
 */
export function getStoredEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_EMAIL_STORAGE_KEY);
}
