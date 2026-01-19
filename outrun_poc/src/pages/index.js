// src/pages/index.js
// Purpose: Landing / login page with OUTRUN branding

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Button, Alert, Box, Chip } from "@mui/material";
import StravaConnectButton from "../components/auth/StravaConnectButton";
import Image from "next/image";
import CountdownTimer from "../components/common/CountdownTimer";
import RulesDialog from "../components/common/RulesDialog";
import { fetchActiveChallenge } from "../services/challengeService";
import { isCurrentUserParticipant } from "../services/participantService";
import { isDemoMode, disableDemoMode } from "../utils/demoMode";
import name from "../assets/name.png";
import logo from "../assets/logo.png";

export default function LandingPage() {
  const [challenge, setChallenge] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [showStravaButton, setShowStravaButton] = useState(false);

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

  const handleJoinChallenge = async () => {
    try {
      // In demo mode, demo user is already a participant (created by init-demo-data)
      if (demoMode) {
        // Just refresh the data to show the participant status
        await loadData();
        return;
      }
      
      // For now: Just reveal Strava button - no Supabase changes
      // Future: Navigate to buy ticket page or enter ticket code
      setShowStravaButton(true);
    } catch (err) {
      console.error("Failed to join challenge", err);
      alert("Failed to join challenge. Please try again.");
    }
  };

  const handleToggleDemoMode = async () => {
    if (demoMode) {
      disableDemoMode();
      setDemoMode(false);
      window.location.reload();
    } else {
      const { enableDemoMode } = await import("../utils/demoMode");
      const result = await enableDemoMode();
      if (result.success) {
        setDemoMode(true);
        // Reload to apply demo mode and initialize demo data
        window.location.reload();
      } else {
        alert("Failed to enable demo mode. Check console for details.");
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        pb: 6,
      }}
    >
      {/* Demo Mode Toggle - Always visible in top right */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Chip
          label={demoMode ? "Demo Mode ON" : "Demo Mode OFF"}
          color={demoMode ? "primary" : "default"}
          onClick={handleToggleDemoMode}
          clickable
          size="small"
        />
      </Box>

      <Container maxWidth="xs" sx={{ py: 6 }}>
        <Stack spacing={3} alignItems="center">
          {/* Name and Logo - directly beneath each other with no extra spacing */}
          <Box 
            sx={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              gap: 0,
              "& > span": {
                display: "block !important",
                margin: "0 !important",
                padding: "0 !important",
                lineHeight: 0,
              },
              "& > span > img": {
                display: "block !important",
                margin: "0 !important",
                padding: "0 !important",
              }
            }}
          >
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
            />
          </Box>

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

            {!isParticipant && !demoMode && !showStravaButton && (
              <Alert severity="info" sx={{ mt: 1 }}>
                You need to join the challenge to connect Strava.
              </Alert>
            )}

            {(isParticipant || demoMode || showStravaButton) && (
              <Box sx={{ mt: 1 }}>
                <StravaConnectButton />
              </Box>
            )}
          </Stack>
        </Stack>
      </Container>

      <RulesDialog
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        challenge={challenge}
      />
    </Box>
  );
}
