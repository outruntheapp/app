// src/pages/api/admin/challenges/index.js
// GET: list all challenges. POST: create challenge (name, slug, starts_at, ends_at).

import { requireAdmin } from "../requireAdmin";

const ROUTES_BUCKET = "routes";
const REQUIRED_GPX_FILES = ["stage-1.gpx", "stage-2.gpx", "stage-3.gpx"];

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { supabase } = admin;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, name, slug, starts_at, ends_at, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    const challenges = data || [];

    // Decorate with GPX presence info from Storage (fallback-safe: if bucket missing, treat as not present).
    const decorated = await Promise.all(
      challenges.map(async (c) => {
        const slug = c.slug || "";
        if (!slug) return { ...c, has_gpx_files: false, missing_gpx_stages: [1, 2, 3] };
        try {
          const { data: files, error: listError } = await supabase.storage
            .from(ROUTES_BUCKET)
            .list(slug, { limit: 100, offset: 0 });
          if (listError) {
            return { ...c, has_gpx_files: false, missing_gpx_stages: [1, 2, 3] };
          }
          const names = new Set((files || []).map((f) => f.name));
          const missing = [];
          REQUIRED_GPX_FILES.forEach((fname, idx) => {
            if (!names.has(fname)) missing.push(idx + 1);
          });
          return { ...c, has_gpx_files: missing.length === 0, missing_gpx_stages: missing.length ? missing : undefined };
        } catch (_) {
          return { ...c, has_gpx_files: false, missing_gpx_stages: [1, 2, 3] };
        }
      })
    );

    return res.status(200).json(decorated);
  }

  if (req.method === "POST") {
    const { name, slug, starts_at, ends_at } = req.body || {};
    if (!name || !slug || !starts_at || !ends_at) {
      return res.status(400).json({ error: "Missing name, slug, starts_at, or ends_at" });
    }
    const slugSafe = String(slug).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!slugSafe) {
      return res.status(400).json({ error: "Invalid slug" });
    }
    const { data, error } = await supabase
      .from("challenges")
      .insert({
        name: String(name).trim(),
        slug: slugSafe,
        starts_at: new Date(starts_at).toISOString(),
        ends_at: new Date(ends_at).toISOString(),
        is_active: false,
      })
      .select("id, name, slug, starts_at, ends_at, is_active")
      .single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }
}
