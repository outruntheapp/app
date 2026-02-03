// supabase/functions/auth-return-signin/index.ts
// Purpose: Return sign-in by email for users who already have Strava linked (no OAuth)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { logInfo, logError } from "../_shared/logger.ts";

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
      .select("strava_athlete_id")
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
      // Do not reveal whether email exists or has Strava
      return new Response(
        JSON.stringify({ success: false, error: "Sign-in not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authEmail = `strava_${userRow.strava_athlete_id}@strava.local`;
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
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
