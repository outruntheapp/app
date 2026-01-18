// src/components/common/RulesDialog.js
// Purpose: Display challenge rules and information

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
} from "@mui/material";
// Using native Date formatting instead of date-fns

export default function RulesDialog({ open, onClose, challenge }) {
  if (!challenge) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Challenge Rules & Information</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" gutterBottom>
            {challenge.name || "Active Challenge"}
          </Typography>
          
          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Start Date
            </Typography>
            <Typography variant="body1">{formatDate(challenge.starts_at)}</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              End Date
            </Typography>
            <Typography variant="body1">{formatDate(challenge.ends_at)}</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            {/* Admin will supply rules text - for now showing basic info */}
            Complete all stages of the challenge within the specified time period.
            Your activities will be automatically matched to the challenge routes.
            Best times for each stage will be recorded.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
