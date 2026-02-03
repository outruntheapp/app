// src/pages/index.js
// Purpose: Landing / login page with OUTRUN branding

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Button, Alert, Box, Chip, TextField } from "@mui/material";
import StravaConnectButton from "../components/auth/StravaConnectButton";
import Image from "next/image";
import CountdownTimer from "../components/common/CountdownTimer";
import RulesDialog from "../components/common/RulesDialog";
import { fetchActiveChallenge } from "../services/challengeService";
import { isCurrentUserParticipant } from "../services/participantService";
import { isDemoMode, disableDemoMode } from "../utils/demoMode";
import { checkStravaConnectionByEmail } from "../services/authService";
import Link from "next/link";
import name from "../assets/name.png";
import logo from "../assets/logo.png";

export default function LandingPage() {
  const [challenge, setChallenge] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [hasStrava, setHasStrava] = useState(null); // null = not checked, true/false = checked
  const [checkingStrava, setCheckingStrava] = useState(false);

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
      
      // Show email input field
      setShowEmailInput(true);
      setEmail("");
      setEmailError("");
      setHasStrava(null);
    } catch (err) {
      console.error("Failed to join challenge", err);
      alert("Failed to join challenge. Please try again.");
    }
  };

  const validateEmail = (emailValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      return "Email is required";
    }
    if (!emailRegex.test(emailValue)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handleEmailSubmit = async () => {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }

    setCheckingStrava(true);
    try {
      const result = await checkStravaConnectionByEmail(email);
      setHasStrava(result.hasStrava);
    } catch (err) {
      console.error("Failed to check Strava connection", err);
      setEmailError("Failed to check connection. Please try again.");
    } finally {
      setCheckingStrava(false);
    }
  };

  const handleEmailKeyPress = (event) => {
    if (event.key === "Enter" && !emailError && email) {
      handleEmailSubmit();
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
      {/* Admin + Demo Mode - top right */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Button component={Link} href="/admin" variant="outlined" size="small">
          Admin
        </Button>
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
            {!showEmailInput ? (
              <>
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
                    You need to join the challenge to connect Strava.
                  </Alert>
                )}
              </>
            ) : (
              <>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyPress={handleEmailKeyPress}
                  error={!!emailError}
                  helperText={emailError || "Enter the email you use for Strava"}
                  fullWidth
                  disabled={checkingStrava}
                  autoFocus
                />

                {hasStrava === null && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleEmailSubmit}
                    disabled={!!emailError || !email || checkingStrava}
                  >
                    {checkingStrava ? "Checking..." : "Continue"}
                  </Button>
                )}

                {hasStrava !== null && (
                  <Box sx={{ mt: 1 }}>
                    <StravaConnectButton email={email} hasStrava={hasStrava} />
                  </Box>
                )}

                <Button
                  variant="text"
                  fullWidth
                  onClick={() => {
                    setShowEmailInput(false);
                    setEmail("");
                    setEmailError("");
                    setHasStrava(null);
                  }}
                  size="small"
                >
                  Cancel
                </Button>
              </>
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
