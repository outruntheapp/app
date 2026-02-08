// src/components/dashboard/RunnerSummaryCard.js
// Purpose: Display runner profile and challenge summary

import { useState, useEffect } from "react";
import { Paper, Typography, Box, Avatar, Button } from "@mui/material";
import { fetchCurrentUser } from "../../services/userService";
import { fetchActiveChallenge, calculateDaysRemaining } from "../../services/challengeService";
import { getStravaConnectionStatus, connectStrava } from "../../services/authService";
import { supabase } from "../../services/supabaseClient";
import { OUTRUN_BURNT, OUTRUN_WHITE } from "../../styles/theme";
import LoadingState from "../common/LoadingState";

export default function RunnerSummaryCard() {
  const [user, setUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [stravaStatus, setStravaStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Refetch when auth state changes (e.g. session restored) so name appears after sign-in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadData();
    });
    return () => subscription?.unsubscribe();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, challengeData, stravaData] = await Promise.all([
        fetchCurrentUser(),
        fetchActiveChallenge(),
        getStravaConnectionStatus(),
      ]);
      setUser(userData);
      setChallenge(challengeData);
      setStravaStatus(stravaData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const daysRemaining = challenge ? calculateDaysRemaining(challenge) : null;
  const userName = user?.full_name || "Runner";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Paper sx={{ p: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
        {/* Left: avatar + name + Strava */}
        <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: "1 1 auto" }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              mr: 1.5,
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontSize: "0.95rem", fontWeight: 600 }} noWrap>
              {userName}
            </Typography>
            {stravaStatus?.hasStrava && !stravaStatus?.hasToken ? (
              <Button
                variant="contained"
                size="small"
                sx={{
                  fontSize: "0.75rem",
                  textTransform: "none",
                  bgcolor: OUTRUN_BURNT,
                  color: OUTRUN_WHITE,
                }}
                onClick={() => (user?.email ? connectStrava(user.email) : window.location.assign("/"))}
              >
                Reconnect Strava
              </Button>
            ) : (
              <Typography variant="caption" color="text.primary" sx={{ fontSize: "0.75rem" }}>
                Strava Connected
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right: challenge name + countdown + dates */}
        {challenge && (
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600, mb: 0.25 }}>
              {challenge.name}
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ fontSize: "0.8rem", mb: 0.25 }}>
              {daysRemaining !== null
                ? `Challenge ends in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
                : "Challenge ended"}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontSize: "0.7rem" }}>
              {new Date(challenge.starts_at).toLocaleDateString()} – {new Date(challenge.ends_at).toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
