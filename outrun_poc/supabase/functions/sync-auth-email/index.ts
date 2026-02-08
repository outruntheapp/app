// supabase/functions/sync-auth-email/index.ts
// One-off: set auth.users.email to public.users.email for users with a real email
// (so password recovery and email sign-in work). Invoke once via Dashboard or:
// curl -X POST "https://<project>.supabase.co/functions/v1/sync-auth-email" \
//   -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { logInfo, logError } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return true;
  return email.endsWith("@strava.local");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { data: users, error: selectError } = await supabaseAdmin
      .from("users")
      .select("id, email");

    if (selectError) {
      logError("sync-auth-email: fetch users failed", selectError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users", details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toSync = (users || []).filter(
      (row) => row.email && !isPlaceholderEmail(row.email)
    );

    if (toSync.length === 0) {
      logInfo("sync-auth-email: no users with real email to sync");
      return new Response(
        JSON.stringify({ synced: 0, failed: 0, message: "No users with real email to sync." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let synced = 0;
    let failed = 0;

    for (const row of toSync) {
      const email = (row.email as string).trim().toLowerCase();
      const { error } = await supabaseAdmin.auth.admin.updateUserById(row.id, {
        email,
        email_confirm: true,
      });
      if (error) {
        logError("sync-auth-email: update failed for user", { id: row.id, error: error.message });
        failed++;
      } else {
        synced++;
      }
    }

    logInfo("sync-auth-email: completed", { synced, failed });
    return new Response(
      JSON.stringify({
        synced,
        failed,
        message: `Synced auth email for ${synced} user(s); ${failed} failed.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logError("sync-auth-email: unexpected error", err);
    return new Response(
      JSON.stringify({ error: "Sync failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
