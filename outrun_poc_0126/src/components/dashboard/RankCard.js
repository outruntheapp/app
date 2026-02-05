// src/components/dashboard/RankCard.js
// Purpose: Display runner ranking summary

import { useState, useEffect } from "react";
import { Paper, Typography, Box, Chip } from "@mui/material";
import { fetchCurrentUser } from "../../services/userService";
import { fetchActiveChallenge } from "../../services/challengeService";
import { fetchUserRank } from "../../services/userService";
import { fetchOverallLeaderboard } from "../../services/leaderboardService";
import LoadingState from "../common/LoadingState";

export default function RankCard() {
  const [user, setUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [rank, setRank] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
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

      if (userData && challengeData) {
        const [userRank, leaderboard] = await Promise.all([
          fetchUserRank(userData.id, challengeData.id),
          fetchOverallLeaderboard(),
        ]);
        setRank(userRank);
        setTotalParticipants(leaderboard?.length || 0);
      }
    } catch (err) {
      console.error("Failed to load rank data", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const getRankDisplay = () => {
    if (rank === null) return "—";
    return `#${rank}`;
  };

  const getRankSuffix = (rank) => {
    if (!rank) return "";
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th";
    if (lastDigit === 1) return "st";
    if (lastDigit === 2) return "nd";
    if (lastDigit === 3) return "rd";
    return "th";
  };

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography variant="caption" color="text.primary" sx={{ fontSize: "0.7rem", display: "block", mb: 1 }}>
        Your Leaderboard Position
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, mb: 1.5 }}>
        <Typography variant="h4" component="span" sx={{ fontSize: "1.75rem", fontWeight: 700 }}>
          {getRankDisplay()}
        </Typography>
        {rank && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
            {getRankSuffix(rank)} place
          </Typography>
        )}
      </Box>
      {totalParticipants > 0 && (
        <Chip
          label={`Out of ${totalParticipants} ${totalParticipants === 1 ? "participant" : "participants"}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: "0.7rem", height: "22px" }}
        />
      )}
      {rank === null && (
        <Typography variant="caption" color="text.primary" sx={{ fontSize: "0.7rem", display: "block", mt: 0.5 }}>
          Complete stages to appear on the leaderboard
        </Typography>
      )}
    </Paper>
  );
}
