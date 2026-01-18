// src/pages/index.js
// Purpose: Landing / login page with OUTRUN branding

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Button, Alert, Box } from "@mui/material";
import StravaConnectButton from "../components/auth/StravaConnectButton";
import Image from "next/image";
import AppHeader from "../components/common/AppHeader";
import CountdownTimer from "../components/common/CountdownTimer";
import RulesDialog from "../components/common/RulesDialog";
import { fetchActiveChallenge } from "../services/challengeService";
import { isCurrentUserParticipant } from "../services/participantService";
import { isDemoMode, enableDemoMode, disableDemoMode } from "../utils/demoMode";
import name from "../assets/name.png";
import logo from "../assets/logo.png";

export default function LandingPage() {
  const [challenge, setChallenge] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    loadData();
    setDemoMode(isDemoMode());
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengeData, participantStatus] = await Promise.all([
        fetchActiveChallenge(),
        isCurrentUserParticipant(),
      ]);
      setChallenge(challengeData);
      setIsParticipant(participantStatus);
    } catch (err) {
      console.error("Failed to load challenge data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = () => {
    // TODO: Navigate to ticket purchase page
    // For now, just show an alert
    alert("Ticket purchase page coming soon!");
  };

  const handleToggleDemoMode = () => {
    if (demoMode) {
      disableDemoMode();
      setDemoMode(false);
    } else {
      enableDemoMode();
      setDemoMode(true);
    }
    // Reload to apply demo mode
    window.location.reload();
  };

  return (
    <>
      <AppHeader />

      <Container maxWidth="xs">
        <Stack spacing={3} mt={10} alignItems="center">
          <Image
            src={name}
            alt="OUTRUN_name"
            width={220}
            priority
          />
          <Image
            src={logo}
            alt="OUTRUN_logo"
            width={220}
            priority
            style={{ marginTop: 0 }}
          />

          <Typography variant="body2" align="center">
            Premium Virtual Running Challenge
          </Typography>

          {challenge && <CountdownTimer targetDate={challenge.starts_at} />}

          <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleJoinChallenge}
            >
              Join Challenge
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => setRulesOpen(true)}
            >
              Rules
            </Button>

            {!isParticipant && !demoMode && (
              <Alert severity="info" sx={{ mt: 1 }}>
                You need a valid ticket to connect Strava. Purchase a ticket first.
              </Alert>
            )}

            {(isParticipant || demoMode) && (
              <Box sx={{ mt: 1 }}>
                <StravaConnectButton />
              </Box>
            )}

            {/* Demo mode toggle for development */}
            {process.env.NODE_ENV === "development" && (
              <Button
                variant="text"
                size="small"
                onClick={handleToggleDemoMode}
                sx={{ mt: 2 }}
              >
                {demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        challenge={challenge}
      />
    </>
  );
}
