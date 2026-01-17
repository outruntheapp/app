// src/components/admin/ParticipantTable.js
// Purpose: Admin table for participant management

import {
    Table, TableHead, TableRow, TableCell, TableBody, Checkbox
  } from "@mui/material";
  
  export default function ParticipantTable({ participants = [], onToggle }) {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Stages</TableCell>
            <TableCell>Excluded</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {participants.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.stages}</TableCell>
              <TableCell>
                <Checkbox
                  checked={!!p.excluded}
                  onChange={() => onToggle(p)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  