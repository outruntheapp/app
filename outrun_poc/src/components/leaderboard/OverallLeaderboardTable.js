// src/components/leaderboard/OverallLeaderboardTable.js
// Purpose: Render overall leaderboard table

import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  Box,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

export default function OverallLeaderboardTable({ rows = [] }) {
  const getStageIcon = (completed, stageNum) => {
    return completed ? (
      <CheckCircleIcon key={stageNum} sx={{ fontSize: 16, color: "primary.main", mr: 0.5 }} />
    ) : (
      <RadioButtonUncheckedIcon
        key={stageNum}
        sx={{ fontSize: 16, color: "text.secondary", mr: 0.5 }}
      />
    );
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Runner</TableCell>
            <TableCell>Stages</TableCell>
            <TableCell>Total Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                No results yet
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.user_id || row.rank}>
                <TableCell>{row.rank}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {[1, 2, 3].map((stage) =>
                      getStageIcon(
                        row.stages_completed >= stage,
                        stage
                      )
                    )}
                    <Chip
                      label={`${row.stages_completed || 0}/3`}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>{row.time}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
  