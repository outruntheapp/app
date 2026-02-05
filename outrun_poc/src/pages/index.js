// src/pages/index.js
// Purpose: Landing / login page with OUTRUN branding

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Button, Alert, Box, Chip, TextField } from "@mui/material";
import StravaConnectButton from "../components/auth/StravaConnectButton";
import Image from "next/image";
import CountdownTimer from "../components/common/CountdownTimer";
import RulesDialog from "../components/common/RulesDialog";
import { fetchActiveChallenge } from "../services/challengeService";
import { isCurrentUserParticipant, joinActiveChallenge } from "../services/participantService";
import { supabase } from "../services/supabaseClient";
import { isDemoMode, disableDemoMode } from "../utils/demoMode";
import { checkStravaConnectionByEmail, clearStoredEmail } from "../services/authService";
import name from "../assets/name.png";
import logo from "../assets/logo.png";
import { OUTRUN_WHITE } from "../styles/theme";

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
  const [hasToken, setHasToken] = useState(null); // null = not checked; true/false when hasStrava
  const [checkingStrava, setCheckingStrava] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [joiningChallenge, setJoiningChallenge] = useState(false);

  useEffect(() => {
    clearStoredEmail();
    loadData();
    setDemoMode(isDemoMode());
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengeData, participantStatus, { data: { user } }] = await Promise.all([
        fetchActiveChallenge(),
        isCurrentUserParticipant(),
        supabase.auth.getUser(),
      ]);
      setChallenge(challengeData);
      setIsParticipant(participantStatus);
      setAuthUser(user ?? null);
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
        await loadData();
        return;
      }
      // Signed in but not participant: call API to join current challenge
      if (authUser && challenge && !isParticipant) {
        setJoiningChallenge(true);
        const result = await joinActiveChallenge();
        setJoiningChallenge(false);
        if (result.success) {
          await loadData();
        } else {
          if (result.code === "TICKET_REQUIRED") {
            alert("You need a valid OUTRUN ticket to join. Purchase at Entry Ninja: https://www.entryninja.com/events/83346-outrun-virtual-run");
          } else {
            alert(result.error || "Failed to join challenge. Please try again.");
          }
        }
        return;
      }
      // Not signed in: show email input
      setShowEmailInput(true);
      setEmail("");
      setEmailError("");
      setHasStrava(null);
      setHasToken(null);
    } catch (err) {
      setJoiningChallenge(false);
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
      setHasToken(result.hasToken);
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
      {/* Demo Mode - top right */}
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
            {!showEmailInput ? (
              <>
                <Button
                  variant={authUser && challenge && !isParticipant ? "contained" : "outlined"}
                  fullWidth
                  onClick={handleJoinChallenge}
                  disabled={joiningChallenge}
                >
                  {joiningChallenge
                    ? "Joining…"
                    : authUser && challenge && !isParticipant
                    ? `Join ${challenge.name}`
                    : "Join Challenge"}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setRulesOpen(true)}
                >
                  Rules
                </Button>

                <Typography variant="caption" display="block" sx={{ textAlign: "center", color: OUTRUN_WHITE }}>
                  Event is ticketed via{" "}
                  <a href="https://www.entryninja.com/events/83346-outrun-virtual-run" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    Entry Ninja
                  </a>
                </Typography>

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
                  helperText={emailError ? emailError : <span style={{ color: OUTRUN_WHITE }}>Enter the email you use for Strava</span>}
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
                    <StravaConnectButton email={email} hasStrava={hasStrava} hasToken={hasToken} />
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
