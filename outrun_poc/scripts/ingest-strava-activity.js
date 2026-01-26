// scripts/ingest-strava-activity.js
// Purpose: Insert one Strava-style activity from a JSON file for testing matching.
// Usage: node scripts/ingest-strava-activity.js path/to/activity.json
// Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)
// See instructions/TEST_STRAVA_RUNS.md

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/ingest-strava-activity.js <path/to/activity.json>");
    process.exit(1);
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    console.error("File not found:", absPath);
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch (e) {
    console.error("Invalid JSON:", e.message);
    process.exit(1);
  }

  const { user_id, polyline, started_at, elapsed_seconds } = payload;
  if (!user_id || !polyline || started_at == null || elapsed_seconds == null) {
    console.error("activity.json must include: user_id, polyline, started_at, elapsed_seconds");
    process.exit(1);
  }

  const row = {
    user_id,
    polyline: String(polyline),
    started_at: new Date(started_at).toISOString(),
    elapsed_seconds: Number(elapsed_seconds),
    activity_type: payload.activity_type || "Run",
  };
  if (payload.strava_activity_id != null) {
    row.strava_activity_id = Number(payload.strava_activity_id);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from("activities").insert(row).select("id").single();

  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  console.log("Inserted activity id:", data.id);
  console.log("Run process-activities (Edge Function or cron) to match to routes.");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
