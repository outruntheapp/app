// src/pages/dashboard.js
// Purpose: Runner dashboard page

import { Stack, Container, Button, Box } from "@mui/material";
import { useRouter } from "next/router";
import AppHeader from "../components/common/AppHeader";
import RunnerSummaryCard from "../components/dashboard/RunnerSummaryCard";
import StageProgressList from "../components/dashboard/StageProgressList";
import RankCard from "../components/dashboard/RankCard";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <>
      <AppHeader />

      <Container maxWidth="sm">
        <Stack spacing={2} mt={3}>
          <RunnerSummaryCard />
          <StageProgressList />
          <RankCard />
          
          {/* View Full Leaderboard CTA */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push("/leaderboard")}
              fullWidth
            >
              View Full Leaderboard
            </Button>
          </Box>
        </Stack>
      </Container>
    </>
  );
}
