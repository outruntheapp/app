// demo/demoService.js
// Purpose: Service to create and manage demo data in Supabase

import { supabase } from "../src/services/supabaseClient";
import { DEMO_USER_ID, DEMO_USER } from "./demoData";
import { logError } from "../src/utils/logger";

// Simple logging for demo service (since logger might not be available)
function logInfo(message, meta = {}) {
  console.log(`[Demo Service] ${message}`, meta);
}

/**
 * Initialize demo data in Supabase via edge function
 * Creates demo user, participant, activities, and stage results.
 * Fetches route-matching polylines from API so demo activities match GPX routes.
 */
export async function initializeDemoData() {
  try {
    logInfo("Initializing demo data via edge function...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or anon key not configured");
    }

    // Get polylines from route GPX so demo activities match routes (optional; falls back in Edge)
    let polylines = null;
    try {
      const polyRes = await fetch("/api/demo-polylines");
      if (polyRes.ok) {
        const data = await polyRes.json();
        if (data && typeof data[1] === "string" && typeof data[2] === "string" && typeof data[3] === "string") {
          polylines = { 1: data[1], 2: data[2], 3: data[3] };
        }
      }
    } catch (e) {
      logInfo("Demo polylines not available, using defaults", e);
    }

    const body = polylines ? { polylines } : {};

    // Call init-demo-data edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/init-demo-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initialize demo data: ${errorText}`);
    }

    const data = await response.json();
    logInfo("Demo data initialized", data);
    
    return { success: true, userId: data.userId };
  } catch (err) {
    logError("Failed to initialize demo data", err);
    throw err;
  }
}

/**
 * Get demo user auth session
 * Calls demo-auth edge function to get credentials and signs in
 */
export async function getDemoAuthSession() {
  try {
    logInfo("Getting demo auth session...");
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or anon key not configured");
    }

    // Call demo-auth edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/demo-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get demo auth session: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.email || !data.password) {
      throw new Error("Invalid response from demo-auth");
    }

    // Sign in with the credentials
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      throw new Error(`Failed to sign in demo user: ${signInError.message}`);
    }

    logInfo("Demo user signed in successfully", { userId: authData.user?.id });
    
    return { success: true, session: authData.session, user: authData.user };
  } catch (err) {
    logError("Failed to get demo auth session", err);
    throw err;
  }
}

/**
 * Get demo stage results (for backward compatibility)
 * Now data comes from Supabase, so this just returns empty array
 * The actual data will be fetched via userService which checks demo mode
 */
export async function getDemoStageResults(userId, challengeId) {
  // Stage results are now in Supabase, fetched via userService
  // This function is kept for backward compatibility but shouldn't be used
  return [];
}

/**
 * Get demo user rank (for backward compatibility)
 * Now data comes from Supabase, so this just returns null
 * The actual rank will be fetched via userService which checks demo mode
 */
export async function getDemoUserRank(userId, challengeId) {
  // User rank is now in Supabase, fetched via userService
  // This function is kept for backward compatibility but shouldn't be used
  return null;
}

/**
 * Clean up demo data (for testing/reset)
 * Note: This requires admin access, so it may not work from client
 */
export async function cleanupDemoData() {
  try {
    // Note: Cleanup would require admin access
    // For now, this is a placeholder
    // In production, you'd want an admin edge function for this
    logInfo("Demo data cleanup not implemented (requires admin access)");
    return { success: true, message: "Cleanup requires admin access" };
  } catch (err) {
    logError("Failed to cleanup demo data", err);
    throw err;
  }
}
