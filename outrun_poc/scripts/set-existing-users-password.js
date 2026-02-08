// scripts/set-existing-users-password.js
// One-off: set password to '0000' for all existing auth users that have a row in public.users.
// Usage: node scripts/set-existing-users-password.js
// Env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)
// Optional: load from .env.local with node -r dotenv/config scripts/set-existing-users-password.js

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

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

  const { data: users, error: selectError } = await supabase.from("users").select("id");
  if (selectError) {
    console.error("Failed to fetch users:", selectError.message);
    process.exit(1);
  }

  if (!users?.length) {
    console.log("No users in public.users. Nothing to do.");
    return;
  }

  const PASSWORD = "0000";
  let ok = 0;
  let fail = 0;

  for (const row of users) {
    const { error } = await supabase.auth.admin.updateUserById(row.id, { password: PASSWORD });
    if (error) {
      console.warn("Failed for user", row.id, error.message);
      fail++;
    } else {
      ok++;
    }
  }

  console.log(`Done. Updated ${ok} user(s); ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
