// @ts-nocheck
// Standalone version for Supabase Dashboard deployment
// Copy this entire file into Supabase Dashboard → Edge Functions → Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("DB_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

function logInfo(message: string, meta: unknown = {}) {
  console.log(JSON.stringify({ level: "info", message, meta }));
}

function logError(message: string, error: unknown) {
  console.error(JSON.stringify({ level: "error", message, error }));
}

/** Ticket gate: admins bypass; else must exist in challenge_ticket_holders for (challengeId, email). */
async function hasValidTicketForChallenge(
  challengeId: string,
  userEmail: string | null | undefined,
  userRole: string | null | undefined
): Promise<boolean> {
  const role = typeof userRole === "string" ? userRole.trim().toLowerCase() : "";
  if (role === "admin") return true;
  const email = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
  if (!email) return false;
  const { data, error } = await supabaseAdmin
    .from("challenge_ticket_holders")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = body?.email;

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = (email as string).trim().toLowerCase();

    const { data: userRow, error: selectError } = await supabaseAdmin
      .from("users")
      .select("id, strava_athlete_id, role")
      .eq("email", trimmedEmail)
      .not("strava_athlete_id", "is", null)
      .maybeSingle();

    if (selectError) {
      logError("Return sign-in: lookup failed", selectError);
      return new Response(
        JSON.stringify({ success: false, error: "Sign-in unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userRow?.strava_athlete_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Sign-in not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure participant for current active challenge (gated by ticket; admins bypass)
    const { data: activeChallenge } = await supabaseAdmin
      .from("challenges")
      .select("id")
      .eq("is_active", true)
      .single();
    if (activeChallenge) {
      const { data: existingParticipant } = await supabaseAdmin
        .from("participants")
        .select("id")
        .eq("user_id", userRow.id)
        .eq("challenge_id", activeChallenge.id)
        .maybeSingle();
      if (!existingParticipant) {
        const allowed = await hasValidTicketForChallenge(
          activeChallenge.id,
          trimmedEmail,
          userRow?.role ?? null
        );
        if (allowed) {
          const { error: participantInsertError } = await supabaseAdmin
            .from("participants")
            .insert({
              user_id: userRow.id,
              challenge_id: activeChallenge.id,
              excluded: false,
            });
          if (participantInsertError) {
            logError("Return sign-in: participant insert failed (non-blocking)", {
              userId: userRow.id,
              challengeId: activeChallenge.id,
              error: participantInsertError.message,
            });
          } else {
            logInfo("Return sign-in: created participant for active challenge", { userId: userRow.id });
          }
        } else {
          logInfo("Return sign-in: skipped participant (no valid ticket)", { userId: userRow.id });
        }
      }
    }

    // Sync auth.users.email to real email so recovery & email sign-in work; then generate link for that email
    const { error: syncErr } = await supabaseAdmin.auth.admin.updateUserById(userRow.id, {
      email: trimmedEmail,
      email_confirm: true,
    });
    if (syncErr) {
      logError("Return sign-in: sync auth email failed (non-blocking)", syncErr);
    }
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: trimmedEmail,
    });

    if (linkError) {
      logError("Return sign-in: generateLink failed", linkError);
      return new Response(
        JSON.stringify({ success: false, error: "Sign-in unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHash =
      linkData?.properties?.hashed_token ??
      (linkData && "hashed_token" in linkData ? (linkData as { hashed_token?: string }).hashed_token : null);

    if (!tokenHash) {
      logError("Return sign-in: no token in generateLink response", linkData);
      return new Response(
        JSON.stringify({ success: false, error: "Sign-in unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logInfo("Return sign-in success", { email: trimmedEmail.substring(0, 3) + "…" });

    return new Response(
      JSON.stringify({ success: true, token_hash: tokenHash, type: "magiclink" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Return sign-in failed", err);
    return new Response(
      JSON.stringify({ success: false, error: "Sign-in failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
