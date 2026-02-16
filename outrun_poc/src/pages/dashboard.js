// src/pages/dashboard.js
// Purpose: Runner dashboard page

import { useState, useEffect } from "react";
import { Stack, Container, Button, Box, Alert, Typography } from "@mui/material";
import { useRouter } from "next/router";
import AppHeader from "../components/common/AppHeader";
import RunnerSummaryCard from "../components/dashboard/RunnerSummaryCard";
import StageProgressList from "../components/dashboard/StageProgressList";
import RankCard from "../components/dashboard/RankCard";
import { isCurrentUserParticipant } from "../services/participantService";
import { supabase } from "../services/supabaseClient";

const RACEPASS_URL = "https://racepass.com/za/races/outrun";

export default function DashboardPage() {
  const router = useRouter();
  const [showTicketCta, setShowTicketCta] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isParticipant = await isCurrentUserParticipant();
      if (mounted && user && !isParticipant) setShowTicketCta(true);
    })();
    return () => { mounted = false; };
  }, []);

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
            py: 1.5,
            px: { xs: 1.5, sm: 2 },
            display: "flex",
            flexDirection: "column",
            height: "100%",
            "& > *": {
              flexShrink: 0,
            },
          }}
        >
          <Stack
            spacing={1.5}
            sx={{
              flex: 1,
              minHeight: 0,
              "& > *": {
                flexShrink: 0,
              },
            }}
          >
            {showTicketCta && (
              <Alert severity="info" sx={{ "& a": { color: "inherit", textDecoration: "underline" } }}>
                <Typography variant="body2">
                  You&apos;re not registered for this challenge. Get your ticket at{" "}
                  <a href={RACEPASS_URL} target="_blank" rel="noopener noreferrer">Racepass</a>.
                </Typography>
              </Alert>
            )}
            <RunnerSummaryCard />
            <StageProgressList />
            <RankCard />
            
            {/* View Full Leaderboard CTA */}
            <Box sx={{ display: "flex", justifyContent: "center", mt: "auto", pt: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => router.push("/leaderboard")}
                fullWidth
                size="small"
                sx={{ fontSize: "0.8rem", py: 0.75 }}
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
