// src/components/auth/StravaConnectButton.js
// Purpose: Render Strava OAuth connect button or ENTER button

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@mui/material";
import { connectStrava } from "../../services/authService";
import { isDemoMode } from "../../utils/demoMode";
import { getDemoAuthSession } from "../../../demo/demoService";
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

      // Check if demo mode is enabled
      if (isDemoMode()) {
        // In demo mode, simulate auth by getting demo session and redirecting
        const session = await getDemoAuthSession();
        if (session.success) {
          // Redirect to dashboard after successful demo auth
          router.push("/dashboard");
        } else {
          throw new Error("Failed to get demo auth session");
        }
      } else {
        // Normal Strava OAuth flow with email
        await connectStrava(email);
      }
    } catch (err) {
      console.error("Connect failed", err);
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
