// src/pages/admin.js
// Purpose: Admin management page

import { Container, Stack } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import ParticipantTable from "../components/admin/ParticipantTable";
import ExportWinnersButton from "../components/admin/ExportWinnersButton";

export default function AdminPage() {
  return (
    <>
      <AppHeader />

      <Container maxWidth="md">
        <Stack spacing={3} mt={3}>
          <ParticipantTable participants={[]} onToggle={() => {}} />
          <ExportWinnersButton onExport={() => {}} />
        </Stack>
      </Container>
    </>
  );
}
