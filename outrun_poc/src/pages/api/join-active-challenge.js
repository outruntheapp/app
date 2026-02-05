// src/pages/api/join-active-challenge.js
// POST: ensure current user is a participant for the active challenge (insert if missing).
// Gated by challenge_ticket_holders; admins (users.role = 'admin') bypass.

import { createClient } from "@supabase/supabase-js";
import { hasValidTicketForChallenge } from "../../lib/ticketValidation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await supabaseAnon.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: activeChallenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (challengeError || !activeChallenge) {
    return res.status(404).json({ error: "No active challenge" });
  }

  const { data: existing } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .eq("challenge_id", activeChallenge.id)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({ joined: true });
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("email, role")
    .eq("id", user.id)
    .maybeSingle();

  const allowed = await hasValidTicketForChallenge(
    supabase,
    activeChallenge.id,
    userRow?.email ?? null,
    userRow?.role ?? null
  );
  if (!allowed) {
    return res.status(403).json({
      error: "No valid ticket",
      code: "TICKET_REQUIRED",
    });
  }

  const { error: insertError } = await supabase.from("participants").insert({
    user_id: user.id,
    challenge_id: activeChallenge.id,
    excluded: false,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return res.status(200).json({ joined: true });
    }
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({ joined: true });
}
