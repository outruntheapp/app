// src/pages/admin.js
// Purpose: Admin management — sign-in (allowlist), challenges CRUD, audit logs.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Container,
  Stack,
  Typography,
  Button,
  TextField,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Alert,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import { supabase } from "../services/supabaseClient";
import { getAdminUser, isAllowedAdminEmail } from "../utils/adminAuth";
import ParticipantTable from "../components/admin/ParticipantTable";
import ExportWinnersButton from "../components/admin/ExportWinnersButton";

const ADMIN_CHALLENGES_URL = "/api/admin/challenges";
const ADMIN_AUDIT_LOGS_URL = "/api/admin/audit-logs";

function getAuthHeaders() {
  return new Promise((resolve) => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolve(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {});
    });
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState("loading"); // loading | signed_out | denied | admin
  const [adminEmail, setAdminEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [denyMessage, setDenyMessage] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addStartsAt, setAddStartsAt] = useState("");
  const [addEndsAt, setAddEndsAt] = useState("");
  const [addError, setAddError] = useState("");
  const [tabValue, setTabValue] = useState(0);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [participants, setParticipants] = useState([]);

  const checkAuth = useCallback(async () => {
    const { user, isAdmin } = await getAdminUser(supabase);
    if (!user) {
      setAuthState("signed_out");
      return;
    }
    if (!isAdmin) {
      setAuthState("denied");
      setDenyMessage("Your email is not allowed to access Admin.");
      return;
    }
    setAuthState("admin");
  }, []);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });
    return () => subscription?.unsubscribe();
  }, [checkAuth]);

  const loadChallenges = useCallback(async () => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setChallengesLoading(true);
    try {
      const res = await fetch(ADMIN_CHALLENGES_URL, { headers });
      if (!res.ok) {
        if (res.status === 403) return checkAuth();
        throw new Error(await res.text());
      }
      const data = await res.json();
      setChallenges(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setChallengesLoading(false);
    }
  }, [checkAuth]);

  const loadAuditLogs = useCallback(async () => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${ADMIN_AUDIT_LOGS_URL}?limit=200`, { headers });
      if (!res.ok) {
        if (res.status === 403) return checkAuth();
        throw new Error(await res.text());
      }
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    if (authState !== "admin") return;
    loadChallenges();
    if (tabValue === 1) loadAuditLogs();
  }, [authState, loadChallenges, tabValue]);

  useEffect(() => {
    if (authState === "admin" && tabValue === 1) loadAuditLogs();
  }, [authState, tabValue, loadAuditLogs]);

  const handleSendOtp = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email) return;
    setOtpError("");
    if (!isAllowedAdminEmail(email)) {
      setOtpError("Access denied. This email is not allowed to access Admin.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setOtpError(error.message || "Failed to send link.");
      return;
    }
    setOtpSent(true);
  };

  const handleAddChallenge = async () => {
    setAddError("");
    const name = addName.trim();
    const slug = addSlug.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!name || !slug) {
      setAddError("Name and slug are required.");
      return;
    }
    const startsAt = addStartsAt ? new Date(addStartsAt).toISOString() : null;
    const endsAt = addEndsAt ? new Date(addEndsAt).toISOString() : null;
    if (!startsAt || !endsAt) {
      setAddError("Start and end dates are required.");
      return;
    }
    const headers = await getAuthHeaders();
    const res = await fetch(ADMIN_CHALLENGES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ name, slug, starts_at: startsAt, ends_at: endsAt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAddError(data.error || res.statusText);
      return;
    }
    setAddName("");
    setAddSlug("");
    setAddStartsAt("");
    setAddEndsAt("");
    loadChallenges();
  };

  const handleSetActive = async (id) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${ADMIN_CHALLENGES_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ is_active: true }),
    });
    if (!res.ok) {
      if (res.status === 403) return checkAuth();
      return;
    }
    loadChallenges();
  };

  if (authState === "loading") {
    return (
      <>
        <AppHeader />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>Loading...</Typography>
        </Container>
      </>
    );
  }

  if (authState === "denied") {
    return (
      <>
        <AppHeader />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{denyMessage}</Alert>
          <Button sx={{ mt: 2 }} onClick={() => router.push("/")}>
            Back to home
          </Button>
        </Container>
      </>
    );
  }

  if (authState === "signed_out") {
    return (
      <>
        <AppHeader />
        <Container maxWidth="xs" sx={{ py: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Admin sign-in</Typography>
            {otpSent ? (
              <Alert severity="success">
                Check your email for the sign-in link. You can close this page after clicking the link.
              </Alert>
            ) : (
              <>
                <TextField
                  label="Email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  fullWidth
                />
                {otpError && <Alert severity="error">{otpError}</Alert>}
                <Button variant="contained" onClick={handleSendOtp} disabled={!adminEmail.trim()}>
                  Send sign-in link
                </Button>
              </>
            )}
            <Button component="a" href="/">
              Back to home
            </Button>
          </Stack>
        </Container>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Admin
        </Typography>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="Challenges" />
          <Tab label="Audit logs" />
          <Tab label="Participants" />
        </Tabs>

        {tabValue === 0 && (
          <Stack spacing={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Add challenge
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                <TextField
                  label="Name"
                  size="small"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  label="Slug (e.g. challenge_2)"
                  size="small"
                  value={addSlug}
                  onChange={(e) => setAddSlug(e.target.value)}
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  label="Starts at"
                  type="datetime-local"
                  size="small"
                  value={addStartsAt}
                  onChange={(e) => setAddStartsAt(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Ends at"
                  type="datetime-local"
                  size="small"
                  value={addEndsAt}
                  onChange={(e) => setAddEndsAt(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Button variant="contained" onClick={handleAddChallenge}>
                  Add
                </Button>
              </Stack>
              {addError && <Alert severity="error" sx={{ mt: 1 }}>{addError}</Alert>}
            </Paper>
            <Paper sx={{ overflow: "auto" }}>
              <Typography variant="subtitle1" sx={{ p: 2 }}>
                All challenges
              </Typography>
              {challengesLoading ? (
                <Box sx={{ p: 2 }}>Loading...</Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Slug</TableCell>
                      <TableCell>Starts</TableCell>
                      <TableCell>Ends</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {challenges.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.slug}</TableCell>
                        <TableCell>{c.starts_at ? new Date(c.starts_at).toLocaleString() : "—"}</TableCell>
                        <TableCell>{c.ends_at ? new Date(c.ends_at).toLocaleString() : "—"}</TableCell>
                        <TableCell>{c.is_active ? <Chip label="Active" color="primary" size="small" /> : "—"}</TableCell>
                        <TableCell>
                          {!c.is_active && (
                            <Button size="small" onClick={() => handleSetActive(c.id)}>
                              Set active
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Stack>
        )}

        {tabValue === 1 && (
          <Paper sx={{ overflow: "auto" }}>
            {auditLoading ? (
              <Box sx={{ p: 2 }}>Loading...</Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Metadata</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entity_type} {log.entity_id ? `(${String(log.entity_id).slice(0, 8)}…)` : ""}</TableCell>
                      <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {tabValue === 2 && (
          <Stack spacing={2}>
            <ParticipantTable participants={participants} onToggle={() => {}} />
            <ExportWinnersButton onExport={() => {}} />
          </Stack>
        )}
      </Container>
    </>
  );
}
