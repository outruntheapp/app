// supabase/functions/_shared/ticketValidation.ts
// Purpose: Gate participant creation on challenge_ticket_holders (admins bypass).

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Returns true if the user is allowed to be a participant for the challenge.
 * - Admins (userRole === 'admin') are always allowed.
 * - Otherwise: allowed only if email exists in challenge_ticket_holders for that challenge.
 */
export async function hasValidTicketForChallenge(
  supabase: SupabaseClient,
  challengeId: string,
  userEmail: string | null | undefined,
  userRole: string | null | undefined
): Promise<boolean> {
  const role = typeof userRole === "string" ? userRole.trim().toLowerCase() : "";
  if (role === "admin") return true;
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
