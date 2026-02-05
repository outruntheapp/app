// src/utils/adminAuth.js
// Admin access: users.role = 'admin' (set manually in table; clients cannot set themselves admin).

/**
 * Get current user and whether they are an admin (users.role === 'admin').
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ user: import('@supabase/supabase-js').User | null, isAdmin: boolean }>}
 */
export async function getAdminUser(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };
  const { data: row } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = row?.role === "admin";
  return { user, isAdmin };
}
