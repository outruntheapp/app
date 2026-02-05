// POST: Re-import routes from GPX for a challenge (public/routes/<slug>/stage-1..3.gpx). Admin only.
// Body: { challenge_id: uuid } — uses that challenge's slug to load GPX and call sync_challenge_routes_from_wkt.

import { requireAdmin } from "./requireAdmin";
import { forceSyncChallengeRoutesFromGpx } from "../../../lib/ensureChallengeRoutes";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { supabase } = admin;

  const challengeId = req.body?.challenge_id;
  if (!challengeId) {
    return res.status(400).json({ error: "challenge_id is required" });
  }

  const { data: challenge, error: fetchError } = await supabase
    .from("challenges")
    .select("id, slug")
    .eq("id", challengeId)
    .single();

  if (fetchError || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  const slug = challenge.slug || "challenge_1";
  const result = await forceSyncChallengeRoutesFromGpx(supabase, challenge.id, slug);

  if (!result.synced) {
    return res.status(400).json({ error: result.error || "Re-import failed" });
  }
  return res.status(200).json({ synced: true, count: result.count, slug });
}
