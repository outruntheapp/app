// src/pages/index.js
// Purpose: Landing — Sign in (email + password), Sign up (ID + email + password → Strava), Forgot password

import { useState, useEffect } from "react";
import { Container, Stack, Typography, Button, Alert, Box, Chip, TextField } from "@mui/material";
import Image from "next/image";
import CountdownTimer from "../components/common/CountdownTimer";
import RulesDialog from "../components/common/RulesDialog";
import { fetchActiveChallenge } from "../services/challengeService";
import { isCurrentUserParticipant, joinActiveChallenge } from "../services/participantService";
import { supabase } from "../services/supabaseClient";
import { isDemoMode, disableDemoMode } from "../utils/demoMode";
import { connectStrava, clearStoredEmail } from "../services/authService";
import name from "../assets/name.png";
import logo from "../assets/logo.png";
import { OUTRUN_WHITE } from "../styles/theme";

const ENTRY_NINJA_URL = "https://www.entryninja.com/events/83346-outrun-virtual-run";

export default function LandingPage() {
  const [challenge, setChallenge] = useState(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [joiningChallenge, setJoiningChallenge] = useState(false);

  // View: 'signin' | 'signup' | 'forgot'
  const [view, setView] = useState("signin");

  // Sign in
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  // Sign up
  const [signUpIdNumber, setSignUpIdNumber] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

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
      if (demoMode) {
        await loadData();
        return;
      }
      if (authUser && challenge && !isParticipant) {
        setJoiningChallenge(true);
        const result = await joinActiveChallenge();
        setJoiningChallenge(false);
        if (result.success) {
          await loadData();
        } else {
          if (result.code === "TICKET_REQUIRED") {
            alert("You need a valid OUTRUN ticket to join. Purchase at Entry Ninja: " + ENTRY_NINJA_URL);
          } else {
            alert(result.error || "Failed to join challenge. Please try again.");
          }
        }
      }
    } catch (err) {
      setJoiningChallenge(false);
      console.error("Failed to join challenge", err);
      alert("Failed to join challenge. Please try again.");
    }
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();
    setSignInError("");
    const email = signInEmail.trim().toLowerCase();
    const password = signInPassword;
    if (!email || !password) {
      setSignInError("Enter email and password");
      return;
    }
    setSignInLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setSignInError("Incorrect email or password");
        return;
      }
      await loadData();
      window.location.replace("/dashboard");
    } catch (err) {
      setSignInError("Incorrect email or password");
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault();
    setSignUpError("");
    const email = signUpEmail.trim().toLowerCase();
    const password = signUpPassword;
    if (!email || !password) {
      setSignUpError("Email and password are required");
      return;
    }
    if (password.length < 6) {
      setSignUpError("Password must be at least 6 characters");
      return;
    }
    setSignUpLoading(true);
    try {
      const base = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_APP_URL || "";
      const res = await fetch(`${base}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_number: signUpIdNumber || null, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSignUpError(data.error || "Sign up failed");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setSignUpError("Account created. Please sign in.");
        return;
      }
      clearStoredEmail();
      connectStrava(email);
    } catch (err) {
      setSignUpError("Sign up failed. Please try again.");
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e?.preventDefault();
    setForgotError("");
    const email = forgotEmail.trim().toLowerCase();
    if (!email) {
      setForgotError("Enter your email");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        setForgotError(error.message || "Failed to send reset link");
        return;
      }
      setForgotSent(true);
    } catch (err) {
      setForgotError("Failed to send reset link");
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
        window.location.reload();
      } else {
        alert("Failed to enable demo mode. Check console for details.");
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

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
      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 1000 }}>
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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              "& > span": { display: "block !important", margin: "0 !important", padding: "0 !important", lineHeight: 0 },
              "& > span > img": { display: "block !important", margin: "0 !important", padding: "0 !important" },
            }}
          >
            <Image src={name} alt="OUTRUN_name" width={220} priority />
            <Image src={logo} alt="OUTRUN_logo" width={220} priority />
          </Box>

          <Typography variant="body2" align="center">
            Premium Virtual Running Challenge
          </Typography>

          {challenge && <CountdownTimer targetDate={challenge.starts_at} />}

          <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
            {authUser ? (
              <>
                <Button
                  variant={challenge && !isParticipant ? "contained" : "outlined"}
                  fullWidth
                  onClick={handleJoinChallenge}
                  disabled={joiningChallenge}
                >
                  {joiningChallenge ? "Joining…" : challenge && !isParticipant ? `Join ${challenge.name}` : "Dashboard"}
                </Button>
                <Button variant="outlined" fullWidth onClick={() => setRulesOpen(true)}>
                  Rules
                </Button>
                <Typography variant="caption" display="block" sx={{ textAlign: "center", color: OUTRUN_WHITE }}>
                  Event is ticketed via{" "}
                  <a href={ENTRY_NINJA_URL} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    Entry Ninja
                  </a>
                </Typography>
              </>
            ) : view === "forgot" ? (
              <>
                <Typography variant="subtitle2">Forgot password</Typography>
                {forgotSent ? (
                  <Alert severity="success">Check your email for a reset link.</Alert>
                ) : (
                  <form onSubmit={handleForgotPassword}>
                    <Stack spacing={2}>
                      <TextField
                        label="Email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        fullWidth
                        size="small"
                        error={!!forgotError}
                        helperText={forgotError}
                      />
                      <Button type="submit" variant="contained" fullWidth>
                        Send reset link
                      </Button>
                    </Stack>
                  </form>
                )}
                <Button variant="text" fullWidth size="small" onClick={() => { setView("signin"); setForgotError(""); setForgotSent(false); }}>
                  Back to Sign in
                </Button>
              </>
            ) : view === "signup" ? (
              <>
                <Typography variant="subtitle2">Sign up</Typography>
                <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
                  Purchase a ticket at Entry Ninja if you haven&apos;t already, to be eligible for the challenge.
                </Alert>
                <form onSubmit={handleSignUp}>
                  <Stack spacing={2}>
                    <TextField
                      label="ID number"
                      value={signUpIdNumber}
                      onChange={(e) => setSignUpIdNumber(e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      fullWidth
                      size="small"
                      required
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      fullWidth
                      size="small"
                      required
                      helperText="At least 6 characters"
                    />
                    {signUpError && <Alert severity="error">{signUpError}</Alert>}
                    <Button type="submit" variant="contained" fullWidth disabled={signUpLoading}>
                      {signUpLoading ? "Signing up…" : "Sign up"}
                    </Button>
                  </Stack>
                </form>
                <Button variant="text" fullWidth size="small" onClick={() => { setView("signin"); setSignUpError(""); }}>
                  Already have an account? Sign in
                </Button>
              </>
            ) : (
              <>
                <Typography variant="subtitle2">Sign in</Typography>
                <form onSubmit={handleSignIn}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      type="email"
                      value={signInEmail}
                      onChange={(e) => { setSignInEmail(e.target.value); setSignInError(""); }}
                      fullWidth
                      size="small"
                      autoComplete="email"
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={signInPassword}
                      onChange={(e) => { setSignInPassword(e.target.value); setSignInError(""); }}
                      fullWidth
                      size="small"
                      autoComplete="current-password"
                    />
                    {signInError && <Alert severity="error">{signInError}</Alert>}
                    <Button type="submit" variant="contained" fullWidth disabled={signInLoading}>
                      {signInLoading ? "Signing in…" : "Sign in"}
                    </Button>
                  </Stack>
                </form>
                <Button variant="text" fullWidth size="small" onClick={() => { setView("forgot"); setForgotEmail(signInEmail); }}>
                  Forgot password?
                </Button>
                <Button variant="text" fullWidth size="small" onClick={() => { setView("signup"); setSignInError(""); }}>
                  Create account (Sign up)
                </Button>
                <Button variant="outlined" fullWidth onClick={() => setRulesOpen(true)} sx={{ mt: 1 }}>
                  Rules
                </Button>
                <Typography variant="caption" display="block" sx={{ textAlign: "center", color: OUTRUN_WHITE }}>
                  Event is ticketed via{" "}
                  <a href={ENTRY_NINJA_URL} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    Entry Ninja
                  </a>
                </Typography>
              </>
            )}
          </Stack>
        </Stack>
      </Container>

      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} challenge={challenge} />
    </Box>
  );
}
