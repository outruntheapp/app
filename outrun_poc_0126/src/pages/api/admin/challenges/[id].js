// src/pages/api/admin/challenges/[id].js
// PATCH: set is_active (only one active at a time). When activating, ensure routes exist (auto-import from GPX if missing).

import { requireAdmin } from "../requireAdmin";
import { ensureChallengeRoutes } from "../../../../lib/ensureChallengeRoutes";

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

  // When activating, ensure this challenge has route entries; if not, import from public/routes/<slug>/
  if (is_active && data?.slug) {
    const result = await ensureChallengeRoutes(supabase, id, data.slug);
    if (result.synced) {
      return res.status(200).json({ ...data, routes_imported: result.count });
    }
    if (result.error) {
      return res.status(200).json({ ...data, routes_imported: 0, routes_note: result.error });
    }
  }

  return res.status(200).json(data);
}
