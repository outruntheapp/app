// src/components/admin/ExportWinnersButton.js
// Purpose: Trigger CSV export of winners

import { Button } from "@mui/material";

export default function ExportWinnersButton({ onExport }) {
  return (
    <Button variant="outlined" onClick={onExport}>
      Export Winners (CSV)
    </Button>
  );
}
