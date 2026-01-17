// src/components/dashboard/StageProgressList.js
// Purpose: Show stage completion progress

import { List, ListItem, ListItemText } from "@mui/material";

export default function StageProgressList() {
  return (
    <List>
      <ListItem>
        <ListItemText primary="Stage 1" secondary="Not completed" />
      </ListItem>
      <ListItem>
        <ListItemText primary="Stage 2" secondary="Not completed" />
      </ListItem>
      <ListItem>
        <ListItemText primary="Stage 3" secondary="Not completed" />
      </ListItem>
    </List>
  );
}
