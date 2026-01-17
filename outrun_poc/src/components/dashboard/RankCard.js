// src/components/dashboard/RankCard.js
// Purpose: Display runner ranking summary

import { Paper, Typography } from "@mui/material";

export default function RankCard() {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2">Your Rank</Typography>
      <Typography variant="h6">Overall: —</Typography>
    </Paper>
  );
}
