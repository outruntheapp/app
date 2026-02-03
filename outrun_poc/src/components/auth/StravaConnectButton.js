// src/components/auth/StravaConnectButton.js
// Purpose: Render Strava OAuth connect button or ENTER button

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@mui/material";
import { connectStrava } from "../../services/authService";
import { supabase } from "../../services/supabaseClient";

export default function StravaConnectButton({ email = null, hasStrava = false, hasToken = true }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    // Check authentication status if user has Strava
    if (hasStrava) {
      checkAuthStatus();
    }
  }, [hasStrava]);

  const checkAuthStatus = async () => {
    setCheckingAuth(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    } catch (err) {
      console.error("Failed to check auth status", err);
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleEnter = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.push("/dashboard");
        return;
      }

      // No session but hasStrava: return sign-in via Edge Function (magic-link token)
      if (hasStrava && email) {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-return-signin`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success && data.token_hash && data.type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: data.type,
          });
          if (verifyError) {
            console.warn("Session verify failed:", verifyError.message);
            alert("Sign-in failed. Please try again or reconnect with Strava.");
            return;
          }
          router.push("/dashboard");
          return;
        }

        const msg = data.error || "Sign-in not available";
        alert(msg);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Enter failed", err);
      alert("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);

      // connectStrava now handles demo mode internally
      // It will simulate OAuth flow by redirecting to callback with demo code
      await connectStrava(email);
    } catch (err) {
      console.error("Connect failed", err);
      // Suppress CORS errors from Strava analytics
      const errorMessage = err.message || String(err);
      if (errorMessage.includes("Access-Control-Allow-Origin") && 
          (errorMessage.includes("strava.com") || errorMessage.includes("google-analytics"))) {
        // This is a third-party analytics CORS error, ignore it
        console.warn("Suppressed third-party analytics CORS error");
        return;
      }
      alert("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Strava linked but no token: show Reconnect Strava (same OAuth flow)
  if (hasStrava && !hasToken) {
    const handleReconnect = () => {
      setLoading(true);
      connectStrava(email);
    };
    return (
      <Button
        variant="contained"
        fullWidth
        onClick={handleReconnect}
        disabled={loading}
      >
        {loading ? "Connecting..." : "Reconnect Strava"}
      </Button>
    );
  }

  // Strava linked and has token: show ENTER button
  if (hasStrava) {
    return (
      <Button
        variant="contained"
        fullWidth
        onClick={handleEnter}
        disabled={loading || checkingAuth}
        color="success"
      >
        {loading || checkingAuth ? "Loading..." : "ENTER"}
      </Button>
    );
  }

  // Otherwise show Connect with Strava button
  return (
    <Button
      variant="contained"
      fullWidth
      onClick={handleConnect}
      disabled={loading}
    >
      {loading ? "Connecting..." : "Connect with Strava"}
    </Button>
  );
}
