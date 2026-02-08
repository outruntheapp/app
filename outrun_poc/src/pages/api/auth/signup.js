// POST /api/auth/signup
// Body: { id_number, email, password }. Creates auth user and public.users row.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const email = (body.email ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();
  const id_number = body.id_number != null ? String(body.id_number).trim() : null;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes("already registered") || authError.code === "user_already_exists") {
      return res.status(400).json({ error: "Email already registered" });
    }
    return res.status(400).json({ error: authError.message || "Sign up failed" });
  }

  const userId = authData?.user?.id;
  if (!userId) {
    return res.status(500).json({ error: "Account created but profile could not be saved" });
  }

  const { error: insertError } = await supabase.from("users").insert({
    id: userId,
    email,
    id_number: id_number || null,
    role: "participant",
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: "Sign up failed. Please try again." });
  }

  return res.status(200).json({ success: true });
}
