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
      if (!code) return;

      try {
        await fetch(
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

        router.replace("/dashboard");
      } catch (err) {
        console.error("Auth callback failed", err);
      }
    };

    finalizeAuth();
  }, [router]);

  return null;
}