// src/components/auth/StravaConnectButton.js
// Purpose: Render Strava OAuth connect button or ENTER button

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@mui/material";
import { connectStrava } from "../../services/authService";
import { supabase } from "../../services/supabaseClient";

export default function StravaConnectButton({ email = null, hasStrava = false }) {
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

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // User is authenticated, redirect to dashboard
        router.push("/dashboard");
      } else {
        // User not authenticated
        // For MVP, redirect to dashboard and let it handle auth state
        // The dashboard will show appropriate UI if user needs to sign in
        // In future, we could implement magic link sign-in here
        router.push("/dashboard");
      }
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

  // If user has Strava, show ENTER button
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
