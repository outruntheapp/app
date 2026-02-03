// GET: list cron_audit_logs (optional limit, offset). Admin only.

import { requireAdmin } from "./requireAdmin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { supabase } = admin;

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const { data, error } = await supabase
    .from("cron_audit_logs")
    .select("id, run_id, job_name, status, created_at, metadata")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ logs: data || [], limit, offset });
}
