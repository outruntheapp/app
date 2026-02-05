// src/components/admin/ParticipantTable.js
// Purpose: Admin table for participant management (Name, Stage, Time, Excluded)

import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Box,
} from "@mui/material";

function formatTime(seconds) {
  if (seconds == null || typeof seconds !== "number") return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ParticipantTable({ participants = [], onToggle }) {
  const seenParticipantIds = new Set();
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Stage</TableCell>
          <TableCell>Time</TableCell>
          <TableCell>Excluded</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {participants.map((p, idx) => {
          const rowKey = `${p.participant_id ?? p.user_id}-${p.stage_number ?? "n"}-${idx}`;
          const isFirstForParticipant = !seenParticipantIds.has(p.participant_id);
          if (isFirstForParticipant) seenParticipantIds.add(p.participant_id);
          return (
            <TableRow key={rowKey}>
              <TableCell>{p.name ?? "—"}</TableCell>
              <TableCell>{p.stage_number != null ? p.stage_number : "—"}</TableCell>
              <TableCell>{formatTime(p.best_time_seconds)}</TableCell>
              <TableCell>
                {isFirstForParticipant ? (
                  <Checkbox
                    checked={!!p.excluded}
                    onChange={() => onToggle(p)}
                  />
                ) : (
                  <Box sx={{ pl: 1 }} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
