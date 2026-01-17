// src/components/auth/StravaConnectButton.js
// Purpose: Render Strava OAuth connect button

import { Button } from "@mui/material";
import { connectStrava } from "../../services/authService";

export default function StravaConnectButton() {
  const handleConnect = async () => {
    try {
      await connectStrava();
    } catch (err) {
      console.error("Strava connect failed", err);
    }
  };

  return (
    <Button
      variant="contained"
      fullWidth
      onClick={handleConnect}
    >
      Connect with Strava
    </Button>
  );
}
