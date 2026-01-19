// src/components/auth/StravaConnectButton.js
// Purpose: Render Strava OAuth connect button

import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@mui/material";
import { connectStrava } from "../../services/authService";
import { isDemoMode } from "../../utils/demoMode";
import { getDemoAuthSession } from "../../../demo/demoService";

export default function StravaConnectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
        // Normal Strava OAuth flow
        await connectStrava();
      }
    } catch (err) {
      console.error("Connect failed", err);
      alert("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
