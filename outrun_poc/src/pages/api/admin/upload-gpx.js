// src/pages/api/admin/upload-gpx.js
// POST: Upload stage-1..3 GPX files to Supabase Storage (routes/<slug>/stage-1..3.gpx). Admin only.
// Multipart: challenge_id, stage_1, stage_2, stage_3

import { IncomingForm } from "formidable";
import { readFile } from "fs/promises";
import { requireAdmin } from "./requireAdmin";
import { forceSyncChallengeRoutesFromGpx } from "../../../lib/ensureChallengeRoutes";

export const config = {
  api: { bodyParser: false },
};

const ROUTES_BUCKET = "routes";

function firstFile(files, ...keys) {
  for (const k of keys) {
    const v = files?.[k];
    const f = Array.isArray(v) ? v[0] : v;
    if (f?.filepath) return f;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { supabase } = admin;

  const form = new IncomingForm({ maxFileSize: 15 * 1024 * 1024, multiples: false });
  let fields;
  let files;
  try {
    ({ fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    }));
  } catch (e) {
    return res.status(400).json({ error: e.message || "Failed to parse form" });
  }

  const challengeIdRaw = fields?.challenge_id?.[0] ?? fields?.challenge_id ?? "";
  const challengeId = (typeof challengeIdRaw === "string" ? challengeIdRaw : "").trim();
  if (!challengeId) {
    return res.status(400).json({ error: "challenge_id required" });
  }

  const stage1 = firstFile(files, "stage_1", "stage1", "stage-1", "file_stage_1");
  const stage2 = firstFile(files, "stage_2", "stage2", "stage-2", "file_stage_2");
  const stage3 = firstFile(files, "stage_3", "stage3", "stage-3", "file_stage_3");
  if (!stage1 || !stage2 || !stage3) {
    return res.status(400).json({ error: "Missing one or more GPX files (stage_1, stage_2, stage_3)" });
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id, slug")
    .eq("id", challengeId)
    .single();
  if (challengeError || !challenge?.slug) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  const slug = challenge.slug;

  const uploadOne = async (stageNumber, file) => {
    const buf = await readFile(file.filepath);
    const objectPath = `${slug}/stage-${stageNumber}.gpx`;
    const { error } = await supabase.storage.from(ROUTES_BUCKET).upload(objectPath, buf, {
      upsert: true,
      contentType: "application/gpx+xml",
      cacheControl: "3600",
    });
    if (error) throw new Error(`Upload failed for stage ${stageNumber}: ${error.message}`);
  };

  try {
    await uploadOne(1, stage1);
    await uploadOne(2, stage2);
    await uploadOne(3, stage3);
  } catch (e) {
    return res.status(400).json({ error: e.message || "Upload failed" });
  }

  const syncResult = await forceSyncChallengeRoutesFromGpx(supabase, challengeId, slug);
  if (!syncResult.synced) {
    return res.status(400).json({ error: syncResult.error || "Uploaded but sync failed" });
  }

  return res.status(200).json({ uploaded: true, synced: true, count: syncResult.count, slug });
}

