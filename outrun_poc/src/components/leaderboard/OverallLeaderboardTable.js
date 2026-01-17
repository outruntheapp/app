// src/components/leaderboard/OverallLeaderboardTable.js
// Purpose: Render overall leaderboard table

import {
    Table, TableHead, TableRow, TableCell, TableBody
  } from "@mui/material";
  
  export default function OverallLeaderboardTable({ rows = [] }) {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Runner</TableCell>
            <TableCell>Time</TableCell>
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
  