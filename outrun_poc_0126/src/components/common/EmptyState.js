// src/components/common/EmptyState.js
// Purpose: Standard empty state display

import { Typography } from "@mui/material";

export default function EmptyState({ message }) {
  return <Typography>{message}</Typography>;
}
