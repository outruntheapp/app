// src/pages/api/admin/challenges/[id].js
// PATCH: set is_active (only one active at a time).

import { requireAdmin } from "../requireAdmin";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { supabase } = admin;
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Missing challenge id" });
  }

  const { is_active } = req.body || {};
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "Body must include is_active (boolean)" });
  }

  if (is_active) {
    // Deactivate all, then activate this one (transaction-like: two updates)
    const { error: errDeactivate } = await supabase
      .from("challenges")
      .update({ is_active: false })
      .neq("id", id);
    if (errDeactivate) {
      return res.status(500).json({ error: errDeactivate.message });
    }
  }

  const { data, error } = await supabase
    .from("challenges")
    .update({ is_active })
    .eq("id", id)
    .select("id, name, slug, starts_at, ends_at, is_active")
    .single();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json(data);
}
