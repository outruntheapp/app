// src/components/leaderboard/StageLeaderboardTable.js
// Purpose: Render per-stage leaderboard

import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Typography,
} from "@mui/material";

export default function StageLeaderboardTable({ rows = [], stageNumber }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
        Stage {stageNumber} Leaderboard
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Runner</TableCell>
            <TableCell>Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center">
                No results yet
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow key={row.user_id || idx}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.time}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
  