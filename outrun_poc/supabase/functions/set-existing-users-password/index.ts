// supabase/functions/set-existing-users-password/index.ts
// One-off: set password to "000000" for all auth users that have a row in public.users.
// Invoke once via Dashboard or: POST with Authorization: Bearer <SERVICE_ROLE_KEY>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { logInfo, logError } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PASSWORD = "000000";

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
    const { data: users, error: selectError } = await supabaseAdmin.from("users").select("id");

    if (selectError) {
      logError("set-existing-users-password: fetch users failed", selectError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users", details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!users?.length) {
      logInfo("set-existing-users-password: no users in public.users");
      return new Response(
        JSON.stringify({ updated: 0, failed: 0, message: "No users in public.users." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    let failed = 0;

    for (const row of users) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(row.id, { password: PASSWORD });
      if (error) {
        logError("set-existing-users-password: update failed for user", { id: row.id, error: error.message });
        failed++;
      } else {
        updated++;
      }
    }

    logInfo("set-existing-users-password: completed", { updated, failed });
    return new Response(
      JSON.stringify({
        updated,
        failed,
        message: `Updated password to ${PASSWORD} for ${updated} user(s); ${failed} failed.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logError("set-existing-users-password: unexpected error", err);
    return new Response(
      JSON.stringify({ error: "Update failed", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
