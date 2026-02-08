// scripts/sync-auth-email-from-public-users.js
// One-off: set auth.users.email to public.users.email for users who have a real email
// (so password recovery and email sign-in work; auth may currently have strava_XXX@strava.local).
// Usage: node scripts/sync-auth-email-from-public-users.js
// Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

function isPlaceholderEmail(email) {
  if (!email || typeof email !== "string") return true;
  return email.endsWith("@strava.local");
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY)"
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error: selectError } = await supabase
    .from("users")
    .select("id, email");
  if (selectError) {
    console.error("Failed to fetch users:", selectError.message);
    process.exit(1);
  }

  const toSync = (users || []).filter((row) => row.email && !isPlaceholderEmail(row.email));
  if (!toSync.length) {
    console.log("No users with real email in public.users to sync.");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const row of toSync) {
    const { error } = await supabase.auth.admin.updateUserById(row.id, {
      email: row.email.trim().toLowerCase(),
      email_confirm: true,
    });
    if (error) {
      console.warn("Failed for user", row.id, error.message);
      fail++;
    } else {
      ok++;
    }
  }

  console.log(`Done. Synced auth email for ${ok} user(s); ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
