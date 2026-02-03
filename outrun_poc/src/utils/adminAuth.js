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
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, isAdmin: boolean }>}
 */
export async function getAdminUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.email ? isAllowedAdminEmail(user.email) : false;
  return { user, isAdmin };
}
