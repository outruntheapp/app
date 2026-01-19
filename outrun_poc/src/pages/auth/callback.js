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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:13',message:'finalizeAuth entry',data:{hasCode:!!code,codePrefix:code?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6,H7,H8,H9'})}).catch(()=>{});
      // #endregion
      if (!code) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:16',message:'No code in query, redirecting',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        router.replace("/");
        return;
      }

      try {
        // Get stored email from localStorage if available
        const userEmail = getStoredEmail();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:23',message:'Retrieved stored email',data:{hasEmail:!!userEmail,emailPrefix:userEmail?.substring(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6,H7'})}).catch(()=>{});
        // #endregion

        // Check if this is a demo OAuth (code starts with "demo_code_")
        const isDemo = typeof code === "string" && code.startsWith("demo_code_");
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:27',message:'Calling edge function',data:{isDemo,supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,30)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6,H7'})}).catch(()=>{});
        // #endregion

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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:45',message:'Edge function response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6,H7'})}).catch(()=>{});
        // #endregion

        if (!response.ok) {
          const errorText = await response.text();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:49',message:'Edge function error response',data:{status:response.status,errorText:errorText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7'})}).catch(()=>{});
          // #endregion
          // Suppress CORS errors from Strava analytics (third-party calls)
          if (errorText.includes("Access-Control-Allow-Origin") && errorText.includes("strava.com")) {
            // This is a third-party analytics CORS error, ignore it
            console.warn("Suppressed Strava analytics CORS error");
          } else {
            throw new Error("Auth callback failed");
          }
        }

        const data = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:58',message:'Edge function response data',data:{success:data.success,hasUserId:!!data.userId,userId:data.userId?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7,H8'})}).catch(()=>{});
        // #endregion
        
        if (data.success && data.userId) {
          // Clear stored email after successful auth
          clearStoredEmail();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:64',message:'Redirecting to dashboard',data:{userId:data.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H8,H9'})}).catch(()=>{});
          // #endregion
          
          // Sign in the user using the email we created
          // Note: This assumes the edge function created an auth user
          // The email format is strava_{athlete_id}@strava.local
          // For MVP, we'll redirect and let the dashboard handle auth state
          // In production, you might want to return a session token from the edge function
          router.replace("/dashboard");
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:72',message:'Edge function did not return success',data:{success:data.success,hasUserId:!!data.userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7'})}).catch(()=>{});
          // #endregion
          throw new Error("Auth callback did not return success");
        }
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/af0ed011-60a4-4d80-97ca-239e912ff0b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/callback.js:76',message:'finalizeAuth exception',data:{errorMessage:err.message,errorStack:err.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H7,H9'})}).catch(()=>{});
        // #endregion
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