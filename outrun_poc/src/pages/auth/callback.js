// src/pages/auth/callback.js
// Handles: (1) Strava OAuth redirect, (2) Password recovery redirect (set new password)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Container, Stack, TextField, Button, Typography, Alert } from "@mui/material";
import { supabase } from "../../services/supabaseClient";
import { clearStoredEmail } from "../../services/authService";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Redirect to home if no code and recovery not detected after a short wait (must run every render for Rules of Hooks)
  useEffect(() => {
    if (!router.isReady || router.query.code) return;
    const t = setTimeout(() => {
      if (!recoveryMode) router.replace("/");
    }, 2000);
    return () => clearTimeout(t);
  }, [router.isReady, router.query.code, recoveryMode]);

  const handleSetNewPassword = async (e) => {
    e?.preventDefault();
    setRecoveryError("");
    if (newPassword.length < 6) {
      setRecoveryError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError("Passwords do not match");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setRecoveryError(error.message || "Failed to update password");
      return;
    }
    setRecoverySuccess(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  };

  useEffect(() => {
    if (!router.isReady) return;
    const code = router.query.code;
    if (code) {
      finalizeStravaAuth();
    }
  }, [router.isReady, router.query.code]);

  async function finalizeStravaAuth() {
    const code = router.query.code;
    if (!code) return;

    try {
      clearStoredEmail();
      const isDemo = typeof code === "string" && code.startsWith("demo_code_");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-strava-callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            ...(isDemo ? { "x-demo-mode": "true" } : {}),
          },
          body: JSON.stringify({ code, userEmail: null }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("Access-Control-Allow-Origin") && errorText.includes("strava.com")) {
          console.warn("Suppressed Strava analytics CORS error");
        } else {
          throw new Error("Auth callback failed");
        }
      }

      const data = await response.json();
      if (data.success && data.userId) {
        clearStoredEmail();
        if (data.token_hash && data.type) {
          await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: data.type });
        }
        router.replace("/dashboard");
      } else {
        throw new Error("Auth callback did not return success");
      }
    } catch (err) {
      console.error("Auth callback failed", err);
      clearStoredEmail();
      router.replace("/?error=auth_failed");
    }
  }

  if (recoveryMode) {
    return (
      <Container maxWidth="xs" sx={{ py: 6 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Set new password</Typography>
          {recoverySuccess ? (
            <Alert severity="success">Password updated. Redirecting…</Alert>
          ) : (
            <form onSubmit={handleSetNewPassword}>
              <Stack spacing={2}>
                <TextField
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  autoComplete="new-password"
                />
                <TextField
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                {recoveryError && <Alert severity="error">{recoveryError}</Alert>}
                <Button type="submit" variant="contained" fullWidth>
                  Update password
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      </Container>
    );
  }

  if (router.query.code) {
    return <Typography sx={{ p: 4, textAlign: "center" }}>Signing you in…</Typography>;
  }

  return <Typography sx={{ p: 4, textAlign: "center" }}>Loading…</Typography>;
}
