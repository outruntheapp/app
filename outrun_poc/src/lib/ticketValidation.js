// src/lib/ticketValidation.js
// Purpose: Gate participant creation on challenge_ticket_holders (admins bypass).

/**
 * Returns true if the user is allowed to be a participant for the challenge.
 * - Admins (userRole === 'admin') are always allowed.
 * - Otherwise: allowed if email is null/empty (legacy) or exists in challenge_ticket_holders for that challenge.
 * @param {object} supabase - Supabase client with service role (bypasses RLS)
 * @param {string} challengeId - uuid of the challenge
 * @param {string|null|undefined} userEmail - user's email (normalised lowercase for lookup)
 * @param {string|null|undefined} userRole - user's role from users.role
 */
export async function hasValidTicketForChallenge(supabase, challengeId, userEmail, userRole) {
  if (userRole === "admin") return true;
  const email = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
  if (!email) return false;
  const { data, error } = await supabase
    .from("challenge_ticket_holders")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
