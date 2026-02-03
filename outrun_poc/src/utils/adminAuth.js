// src/utils/adminAuth.js
// Allowlist for admin access (Admin page, admin API routes).

const ADMIN_EMAILS = new Set([
  "etiennevanzyl21@gmail.com",
  "run@outrun.co.za",
  "carlienrust@gmail.com",
]);

export function isAllowedAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

/**
 * Get current user and whether they are an allowed admin.
 * Checks auth.user.email and public.users.email (for Strava users whose auth email is strava_X@strava.local).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, isAdmin: boolean }>}
 */
export async function getAdminUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };
  let isAdmin = isAllowedAdminEmail(user.email);
  if (!isAdmin && user.id) {
    const { data: row } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
    if (row && typeof row.email === "string" && row.email.trim()) isAdmin = isAllowedAdminEmail(row.email);
  }
  return { user, isAdmin };
}
