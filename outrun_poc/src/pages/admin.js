// src/pages/admin.js
// Purpose: Admin management — access when users.role === 'admin'; challenges CRUD, audit logs.

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AppHeader from "../components/common/AppHeader";
import { supabase } from "../services/supabaseClient";
import { getAdminUser } from "../utils/adminAuth";
import { setParticipantExcluded } from "../services/adminService";
import ParticipantTable from "../components/admin/ParticipantTable";
import ExportWinnersButton from "../components/admin/ExportWinnersButton";
import { OUTRUN_WHITE, OUTRUN_TEXT_SECONDARY } from "../styles/theme";

const ADMIN_CHALLENGES_URL = "/api/admin/challenges";
const ADMIN_PARTICIPANTS_URL = "/api/admin/participants";
const ADMIN_AUDIT_LOGS_URL = "/api/admin/audit-logs";
const ADMIN_CRON_AUDIT_LOGS_URL = "/api/admin/cron-audit-logs";
const ADMIN_UPLOAD_GPX_URL = "/api/admin/upload-gpx";

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
  const [denyMessage, setDenyMessage] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addStartsAt, setAddStartsAt] = useState("");
  const [addEndsAt, setAddEndsAt] = useState("");
  const [addError, setAddError] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [reimportChallengeId, setReimportChallengeId] = useState(null);
  const [reimportMessage, setReimportMessage] = useState(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadChallenge, setUploadChallenge] = useState(null);
  const [uploadFiles, setUploadFiles] = useState({ stage1: null, stage2: null, stage3: null });
  const [uploadingGpx, setUploadingGpx] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [cronLogs, setCronLogs] = useState([]);
  const [cronLogsLoading, setCronLogsLoading] = useState(false);
  const [cronHasMore, setCronHasMore] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [ticketHoldersChallengeId, setTicketHoldersChallengeId] = useState("");
  const [ticketHoldersFile, setTicketHoldersFile] = useState(null);
  const [ticketHoldersUploading, setTicketHoldersUploading] = useState(false);
  const [ticketHoldersResult, setTicketHoldersResult] = useState(null);

  const checkAuth = useCallback(async () => {
    const { user, isAdmin } = await getAdminUser(supabase);
    if (!user) {
      setAuthState("signed_out");
      return;
    }
    if (!isAdmin) {
      setAuthState("denied");
      setDenyMessage("Your account does not have admin access.");
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

  const PAGE_SIZE = 10;
  const loadAuditLogs = useCallback(async (offset = 0) => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`${ADMIN_AUDIT_LOGS_URL}?limit=${PAGE_SIZE}&offset=${offset}`, { headers });
      if (!res.ok) {
        if (res.status === 403) return checkAuth();
        throw new Error(await res.text());
      }
      const data = await res.json();
      const logs = data.logs || [];
      if (offset === 0) setAuditLogs(logs);
      else setAuditLogs((prev) => [...prev, ...logs]);
      setAuditHasMore(logs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  }, [checkAuth]);

  const loadCronLogs = useCallback(async (offset = 0) => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setCronLogsLoading(true);
    try {
      const res = await fetch(`${ADMIN_CRON_AUDIT_LOGS_URL}?limit=${PAGE_SIZE}&offset=${offset}`, { headers });
      if (!res.ok) {
        if (res.status === 403) return checkAuth();
        throw new Error(await res.text());
      }
      const data = await res.json();
      const logs = data.logs || [];
      if (offset === 0) setCronLogs(logs);
      else setCronLogs((prev) => [...prev, ...logs]);
      setCronHasMore(logs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setCronLogsLoading(false);
    }
  }, [checkAuth]);

  const loadParticipants = useCallback(async () => {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setParticipantsLoading(true);
    try {
      const res = await fetch(ADMIN_PARTICIPANTS_URL, { headers });
      if (!res.ok) {
        if (res.status === 403) return checkAuth();
        throw new Error(await res.text());
      }
      const data = await res.json();
      setParticipants(data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setParticipantsLoading(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    if (authState !== "admin") return;
    loadChallenges();
    if (tabValue === 1) loadParticipants();
    if (tabValue === 2) loadAuditLogs();
    if (tabValue === 3) loadCronLogs();
  }, [authState, loadChallenges, loadParticipants, loadAuditLogs, loadCronLogs, tabValue]);

  useEffect(() => {
    if (authState === "admin" && tabValue === 1) loadParticipants();
  }, [authState, tabValue, loadParticipants]);
  useEffect(() => {
    if (authState === "admin" && tabValue === 2) loadAuditLogs();
  }, [authState, tabValue, loadAuditLogs]);
  useEffect(() => {
    if (authState === "admin" && tabValue === 3) loadCronLogs();
  }, [authState, tabValue, loadCronLogs]);

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

    // Prompt GPX upload right after creating a new challenge
    if (data?.id && data?.slug) {
      setUploadChallenge(data);
      setUploadFiles({ stage1: null, stage2: null, stage3: null });
      setUploadDialogOpen(true);
    }
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

  const handleReimportRoutes = async (challengeId) => {
    setReimportMessage(null);
    setReimportChallengeId(challengeId);
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    try {
      const res = await fetch("/api/admin/reimport-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ challenge_id: challengeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReimportMessage({ type: "error", text: data.error || res.statusText });
        return;
      }
      setReimportMessage({ type: "success", text: `Re-imported ${data.count ?? 0} route(s) from GPX for ${data.slug ?? "challenge"}.` });
    } catch (e) {
      setReimportMessage({ type: "error", text: e.message || "Re-import failed" });
    } finally {
      setReimportChallengeId(null);
    }
  };

  const openUploadDialog = (challengeRow) => {
    setReimportMessage(null);
    setUploadChallenge(challengeRow);
    setUploadFiles({ stage1: null, stage2: null, stage3: null });
    setUploadDialogOpen(true);
  };

  const closeUploadDialog = () => {
    if (uploadingGpx) return;
    setUploadDialogOpen(false);
    setUploadChallenge(null);
    setUploadFiles({ stage1: null, stage2: null, stage3: null });
  };

  const handleUploadGpx = async () => {
    if (!uploadChallenge?.id) return;
    if (!uploadFiles.stage1 || !uploadFiles.stage2 || !uploadFiles.stage3) {
      setReimportMessage({ type: "error", text: "Please choose Stage 1, Stage 2, and Stage 3 GPX files." });
      return;
    }
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setUploadingGpx(true);
    setReimportMessage(null);

    try {
      const form = new FormData();
      form.append("challenge_id", uploadChallenge.id);
      form.append("stage_1", uploadFiles.stage1);
      form.append("stage_2", uploadFiles.stage2);
      form.append("stage_3", uploadFiles.stage3);
      const res = await fetch(ADMIN_UPLOAD_GPX_URL, {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReimportMessage({ type: "error", text: data.error || res.statusText });
        return;
      }
      setReimportMessage({
        type: "success",
        text: `Uploaded GPX and synced ${data.count ?? 0} route(s) for ${data.slug ?? uploadChallenge.slug ?? "challenge"}.`,
      });
      closeUploadDialog();
      loadChallenges();
    } catch (e) {
      setReimportMessage({ type: "error", text: e.message || "Upload failed" });
    } finally {
      setUploadingGpx(false);
    }
  };

  const handleTicketHoldersUpload = async () => {
    if (!ticketHoldersChallengeId || !ticketHoldersFile) return;
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setTicketHoldersUploading(true);
    setTicketHoldersResult(null);
    try {
      const form = new FormData();
      form.append("challenge_id", ticketHoldersChallengeId);
      form.append("file", ticketHoldersFile);
      const res = await fetch("/api/admin/ticket-holders", {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTicketHoldersResult({ error: data.error || res.statusText });
        return;
      }
      setTicketHoldersResult({ imported: data.imported, skipped: data.skipped, errors: data.errors });
      setTicketHoldersFile(null);
    } catch (e) {
      setTicketHoldersResult({ error: e.message || "Upload failed" });
    } finally {
      setTicketHoldersUploading(false);
    }
  };

  const handleParticipantToggle = async (row) => {
    const { user } = await getAdminUser(supabase);
    if (!user?.id || row.participant_id == null) return;
    try {
      await setParticipantExcluded(user.id, row.participant_id, !row.excluded);
      loadParticipants();
    } catch (e) {
      console.error(e);
    }
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
            <Alert severity="info">Sign in to access Admin.</Alert>
            <Button component="a" href="/" variant="contained">
              Go to home
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
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            mb: 2,
            "& .MuiTab-root": {
              color: OUTRUN_WHITE,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              minHeight: { xs: 42, sm: 48 },
              px: { xs: 1, sm: 2 },
            },
            "& .Mui-selected": { color: OUTRUN_TEXT_SECONDARY },
          }}
        >
          <Tab label="Challenges" />
          <Tab label="Participants" />
          <Tab label="Audit Logs" />
          <Tab label="Cron Logs" />
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
                <Button variant="contained" onClick={handleAddChallenge} sx={{ height: 40 }}>
                  Add
                </Button>
              </Stack>
              {addError && <Alert severity="error" sx={{ mt: 1 }}>{addError}</Alert>}
            </Paper>
            {reimportMessage && (
              <Alert severity={reimportMessage.type} onClose={() => setReimportMessage(null)} sx={{ mb: 1 }}>
                {reimportMessage.text}
              </Alert>
            )}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Upload ticket holders (Entry Ninja CSV)
              </Typography>
              <Typography variant="caption" color="text.primary">
                IMPORTANT COLUMNS: name, email, id_number
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" sx={{ flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Challenge</InputLabel>
                  <Select
                    value={ticketHoldersChallengeId}
                    label="Challenge"
                    onChange={(e) => setTicketHoldersChallengeId(e.target.value)}
                  >
                    {challenges.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" component="label" sx={{ height: 40 }}>
                  {ticketHoldersFile ? ticketHoldersFile.name : "Choose CSV"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(e) => setTicketHoldersFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                <Button
                  variant="contained"
                  disabled={!ticketHoldersChallengeId || !ticketHoldersFile || ticketHoldersUploading}
                  onClick={handleTicketHoldersUpload}
                  sx={{ height: 40 }}
                >
                  {ticketHoldersUploading ? "Uploading…" : "Upload"}
                </Button>
              </Stack>
              {ticketHoldersResult && (
                <Box sx={{ mt: 2 }}>
                  {ticketHoldersResult.error ? (
                    <Alert severity="error">{ticketHoldersResult.error}</Alert>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Imported: {ticketHoldersResult.imported ?? 0}, Skipped: {ticketHoldersResult.skipped ?? 0}
                      </Typography>
                      {ticketHoldersResult.errors?.length > 0 && (
                        <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                          {ticketHoldersResult.errors.map((e) => `Row ${e.row}: ${e.message}`).join("\n")}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              )}
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
                      <TableCell>Routes</TableCell>
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
                          {c.has_gpx_files ? (
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={reimportChallengeId === c.id}
                              onClick={() => handleReimportRoutes(c.id)}
                              sx={{
                                fontSize: { xs: "0.7rem", sm: "0.8125rem" },
                                px: { xs: 1, sm: 2 },
                                py: { xs: 0.5, sm: 0.75 },
                              }}
                            >
                              {reimportChallengeId === c.id ? "Importing…" : "Re-import routes from GPX"}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => openUploadDialog(c)}
                              sx={{
                                fontSize: { xs: "0.7rem", sm: "0.8125rem" },
                                px: { xs: 1, sm: 2 },
                                py: { xs: 0.5, sm: 0.75 },
                              }}
                            >
                              Upload GPX files
                            </Button>
                          )}
                        </TableCell>
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

        <Dialog open={uploadDialogOpen} onClose={closeUploadDialog} fullWidth maxWidth="sm">
          <DialogTitle>Upload GPX files</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload stage GPX files for <strong>{uploadChallenge?.name || uploadChallenge?.slug || "challenge"}</strong>.
              Files will be stored under <code>routes/{uploadChallenge?.slug}/</code>.
            </Typography>

            <Stack spacing={1.5}>
              <Button variant="outlined" component="label" disabled={uploadingGpx}>
                {uploadFiles.stage1 ? uploadFiles.stage1.name : "Choose Stage 1 GPX"}
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml,application/octet-stream,text/xml,application/xml"
                  hidden
                  onChange={(e) => setUploadFiles((p) => ({ ...p, stage1: e.target.files?.[0] ?? null }))}
                />
              </Button>
              <Button variant="outlined" component="label" disabled={uploadingGpx}>
                {uploadFiles.stage2 ? uploadFiles.stage2.name : "Choose Stage 2 GPX"}
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml,application/octet-stream,text/xml,application/xml"
                  hidden
                  onChange={(e) => setUploadFiles((p) => ({ ...p, stage2: e.target.files?.[0] ?? null }))}
                />
              </Button>
              <Button variant="outlined" component="label" disabled={uploadingGpx}>
                {uploadFiles.stage3 ? uploadFiles.stage3.name : "Choose Stage 3 GPX"}
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml,application/octet-stream,text/xml,application/xml"
                  hidden
                  onChange={(e) => setUploadFiles((p) => ({ ...p, stage3: e.target.files?.[0] ?? null }))}
                />
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeUploadDialog} disabled={uploadingGpx}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleUploadGpx} disabled={uploadingGpx}>
              {uploadingGpx ? "Uploading…" : "Upload"}
            </Button>
          </DialogActions>
        </Dialog>

        {tabValue === 1 && (
          <Stack spacing={2}>
            <Paper sx={{ overflow: "auto" }}>
              <Typography variant="subtitle1" sx={{ p: 2 }}>
                Participants
              </Typography>
              {participantsLoading ? (
                <Box sx={{ p: 2 }}>Loading...</Box>
              ) : (
                <ParticipantTable
                  participants={participants}
                  onToggle={handleParticipantToggle}
                />
              )}
            </Paper>
            <ExportWinnersButton onExport={() => {}} />
          </Stack>
        )}

        {tabValue === 2 && (
          <Paper sx={{ overflow: "auto" }}>
            {auditLoading && auditLogs.length === 0 ? (
              <Box sx={{ p: 2 }}>Loading...</Box>
            ) : (
              <>
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
                {auditHasMore && (
                  <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                    <Button variant="outlined" disabled={auditLoading} onClick={() => loadAuditLogs(auditLogs.length)}>
                      {auditLoading ? "Loading…" : "Load more"}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        )}

        {tabValue === 3 && (
          <Paper sx={{ overflow: "auto" }}>
            {cronLogsLoading && cronLogs.length === 0 ? (
              <Box sx={{ p: 2 }}>Loading...</Box>
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Created</TableCell>
                      <TableCell>Run ID</TableCell>
                      <TableCell>Job</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Metadata</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cronLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{String(log.run_id).slice(0, 8)}…</TableCell>
                        <TableCell>{log.job_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.status}
                            size="small"
                            color={log.status === "completed" ? "success" : log.status === "failed" ? "error" : "default"}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.metadata && Object.keys(log.metadata).length ? JSON.stringify(log.metadata) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {cronHasMore && (
                  <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                    <Button variant="outlined" disabled={cronLogsLoading} onClick={() => loadCronLogs(cronLogs.length)}>
                      {cronLogsLoading ? "Loading…" : "Load more"}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        )}
      </Container>
    </>
  );
}
