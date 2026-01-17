// src/components/leaderboard/StageLeaderboardTable.js
// Purpose: Render per-stage leaderboard

import {
    Table, TableHead, TableRow, TableCell, TableBody
  } from "@mui/material";
  
  export default function StageLeaderboardTable({ rows = [] }) {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Runner</TableCell>
            <TableCell>Stage Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={row.id || idx}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  