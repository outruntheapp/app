// src/pages/dashboard.js
// Purpose: Runner dashboard page

import { Stack, Container } from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import RunnerSummaryCard from "../components/dashboard/RunnerSummaryCard";
import StageProgressList from "../components/dashboard/StageProgressList";
import RankCard from "../components/dashboard/RankCard";

export default function DashboardPage() {
  return (
    <>
      <AppHeader />

      <Container maxWidth="sm">
        <Stack spacing={2} mt={3}>
          <RunnerSummaryCard />
          <StageProgressList />
          <RankCard />
        </Stack>
      </Container>
    </>
  );
}
