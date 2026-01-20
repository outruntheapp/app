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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <AppHeader />

      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            py: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            "& > *": {
              flexShrink: 0,
            },
          }}
        >
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              minHeight: 0,
              "& > *": {
                flexShrink: 0,
              },
            }}
          >
            <RunnerSummaryCard />
            <StageProgressList />
            <RankCard />
            
            {/* View Full Leaderboard CTA */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: "auto", pt: 2 }}>
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
      </Box>
    </Box>
  );
}
