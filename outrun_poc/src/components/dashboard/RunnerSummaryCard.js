// src/components/dashboard/RunnerSummaryCard.js
// Purpose: Display runner profile and challenge summary

import { Paper, Typography } from "@mui/material";

export default function RunnerSummaryCard() {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">OUTRUN 21</Typography>
      <Typography variant="body2">
        Challenge ends in — days
      </Typography>
    </Paper>
  );
}
