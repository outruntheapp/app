// src/pages/api/admin/requireAdmin.js
// Returns { user, supabase } if request is from an allowed admin; otherwise sends 403 and returns null.

import { createClient } from "@supabase/supabase-js";
import { isAllowedAdminEmail } from "../../../utils/adminAuth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

export async function requireAdmin(req, res) {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    res.status(500).json({ error: "Server configuration error" });
    return null;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user || !isAllowedAdminEmail(user?.email)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  return { user, supabase };
}
