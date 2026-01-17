// src/components/dashboard/RunnerSummaryCard.js
// Purpose: Display runner profile and challenge summary

import { useState, useEffect } from "react";
import { Paper, Typography, Box, Avatar, CircularProgress } from "@mui/material";
import { fetchCurrentUser } from "../../services/userService";
import { fetchActiveChallenge, calculateDaysRemaining } from "../../services/challengeService";
import LoadingState from "../common/LoadingState";

export default function RunnerSummaryCard() {
  const [user, setUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, challengeData] = await Promise.all([
        fetchCurrentUser(),
        fetchActiveChallenge(),
      ]);
      setUser(userData);
      setChallenge(challengeData);
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
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            mr: 2,
            fontWeight: 700,
          }}
        >
          {initials}
        </Avatar>
        <Box>
          <Typography variant="h6">{userName}</Typography>
          <Typography variant="body2" color="text.secondary">
            Strava Connected
          </Typography>
        </Box>
      </Box>

      {challenge && (
        <Box>
          <Typography variant="h5" gutterBottom>
            {challenge.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {daysRemaining !== null
              ? `Challenge ends in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
              : "Challenge ended"}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {new Date(challenge.starts_at).toLocaleDateString()} -{" "}
            {new Date(challenge.ends_at).toLocaleDateString()}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
