// src/pages/auth/callback.js
// Purpose: Handle Strava OAuth redirect and finalize login

import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../services/supabaseClient";

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
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-strava-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          throw new Error("Auth callback failed");
        }

        const data = await response.json();
        
        if (data.success && data.userId) {
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
        console.error("Auth callback failed", err);
        router.replace("/?error=auth_failed");
      }
    };

    if (router.isReady) {
      finalizeAuth();
    }
  }, [router]);

  return null;
}