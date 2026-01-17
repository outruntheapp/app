// src/components/common/LoadingState.js
// Purpose: Standard loading indicator

import { CircularProgress, Typography, Stack } from "@mui/material";

export default function LoadingState({ message = "Loading…" }) {
  return (
    <Stack alignItems="center" spacing={2}>
      <CircularProgress />
      <Typography>{message}</Typography>
    </Stack>
  );
}
