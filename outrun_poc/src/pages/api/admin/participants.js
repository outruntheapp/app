// GET: list participants for active challenge (or challenge_id), joined with users + stage_results

import { requireAdmin } from "./requireAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { supabase } = admin;

  let challengeId = req.query.challenge_id?.trim() || null;
  if (!challengeId) {
    const { data: active } = await supabase
      .from("challenges")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    challengeId = active?.id ?? null;
  }
  if (!challengeId) {
    return res.status(200).json({ rows: [] });
  }

  const { data: participants, error: pErr } = await supabase
    .from("participants")
    .select("id, user_id, excluded")
    .eq("challenge_id", challengeId);
  if (pErr) {
    return res.status(500).json({ error: pErr.message });
  }
  if (!participants?.length) {
    return res.status(200).json({ rows: [] });
  }

  const userIds = [...new Set(participants.map((p) => p.user_id))];
  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in("id", userIds);
  if (uErr) {
    return res.status(500).json({ error: uErr.message });
  }
  const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

  const { data: ticketHolders, error: thErr } = await supabase
    .from("challenge_ticket_holders")
    .select("email, ticket_type")
    .eq("challenge_id", challengeId);
  if (thErr) {
    return res.status(500).json({ error: thErr.message });
  }
  const ticketTypeByEmail = Object.fromEntries(
    (ticketHolders || [])
      .filter((th) => typeof th.email === "string" && th.email.trim())
      .map((th) => [th.email.trim().toLowerCase(), th.ticket_type || null])
  );

  const { data: stageResults, error: srErr } = await supabase
    .from("stage_results")
    .select("user_id, stage_number, best_time_seconds")
    .eq("challenge_id", challengeId)
    .in("user_id", userIds);
  if (srErr) {
    return res.status(500).json({ error: srErr.message });
  }

  const rows = [];
  for (const p of participants) {
    const name = userMap[p.user_id]?.full_name ?? null;
    const email = userMap[p.user_id]?.email ?? null;
    const ticket_type =
      typeof email === "string" && email.trim()
        ? ticketTypeByEmail[email.trim().toLowerCase()] ?? null
        : null;
    const stagesForUser = (stageResults || []).filter((sr) => sr.user_id === p.user_id);
    if (stagesForUser.length === 0) {
      rows.push({
        participant_id: p.id,
        user_id: p.user_id,
        name: name ?? "—",
        ticket_type,
        excluded: !!p.excluded,
        stage_number: null,
        best_time_seconds: null,
      });
    } else {
      for (const sr of stagesForUser) {
        rows.push({
          participant_id: p.id,
          user_id: p.user_id,
          name: name ?? "—",
          ticket_type,
          excluded: !!p.excluded,
          stage_number: sr.stage_number,
          best_time_seconds: sr.best_time_seconds,
        });
      }
    }
  }

  return res.status(200).json({ rows });
}
