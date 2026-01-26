// src/pages/auth/callback.js
// Purpose: Handle Strava OAuth redirect and finalize login

import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../services/supabaseClient";
import { getStoredEmail, clearStoredEmail } from "../../services/authService";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finalizeAuth = async () => {
      const code = router.query.code;
      if (!code) {
        router.replace("/");
        return;
      }

      try {
        // Get stored email from localStorage if available
        const userEmail = getStoredEmail();

        // Check if this is a demo OAuth (code starts with "demo_code_")
        const isDemo = typeof code === "string" && code.startsWith("demo_code_");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-strava-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              ...(isDemo ? { "x-demo-mode": "true" } : {}), // Signal demo mode
            },
            body: JSON.stringify({ 
              code,
              userEmail: userEmail || null, // Pass email if available
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          // Suppress CORS errors from Strava analytics (third-party calls)
          if (errorText.includes("Access-Control-Allow-Origin") && errorText.includes("strava.com")) {
            // This is a third-party analytics CORS error, ignore it
            console.warn("Suppressed Strava analytics CORS error");
          } else {
            throw new Error("Auth callback failed");
          }
        }

        const data = await response.json();

        if (data.success && data.userId) {
          // Clear stored email after successful auth
          clearStoredEmail();

          // Sign in the user using the email we created
          // Note: This assumes the edge function created an auth user
          // The email format is strava_{athlete_id}@strava.local
          // For MVP, we'll redirect and let the dashboard handle auth state
          // In production, you might want to return a session token from the edge function
          router.replace("/dashboard");
        } else {
          throw new Error("Auth callback did not return success");
        }
      } catch (err) {
        // Suppress CORS errors from Strava analytics
        const errorMessage = err.message || String(err);
        if (errorMessage.includes("Access-Control-Allow-Origin") && 
            (errorMessage.includes("strava.com") || errorMessage.includes("google-analytics"))) {
          // This is a third-party analytics CORS error, ignore it
          console.warn("Suppressed third-party analytics CORS error");
          // Still proceed with redirect if we have a code
          if (router.query.code) {
            router.replace("/dashboard");
            return;
          }
        }
        
        console.error("Auth callback failed", err);
        // Clear stored email on error
        clearStoredEmail();
        router.replace("/?error=auth_failed");
      }
    };

    if (router.isReady) {
      finalizeAuth();
    }
  }, [router]);

  return null;
}