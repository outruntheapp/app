// supabase/functions/auth-strava-callback/index.ts
// Purpose: Handle Strava OAuth callback and store tokens securely

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { writeAuditLog } from "../_shared/audit.ts";
import { logInfo, logError } from "../_shared/logger.ts";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response("Missing OAuth code", { status: 400 });
    }

    logInfo("Processing Strava OAuth callback", { code: code.substring(0, 10) });

    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID"),
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      logError("Strava token exchange failed", { status: tokenRes.status, error: errorText });
      throw new Error("Strava token exchange failed");
    }

    const tokenData = await tokenRes.json();
    const athlete = tokenData.athlete;

    let userId: string;

    // Check if user exists by strava_athlete_id
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("strava_athlete_id", athlete.id)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      // Update user info
      await supabaseAdmin
        .from("users")
        .update({
          full_name: `${athlete.firstname} ${athlete.lastname}`,
          sex: athlete.sex,
        })
        .eq("id", userId);
    } else {
      // Create auth user first using Admin API
      // Use Strava athlete ID as a unique identifier
      const email = `strava_${athlete.id}@strava.local`;
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          strava_athlete_id: athlete.id,
          full_name: `${athlete.firstname} ${athlete.lastname}`,
        },
      });

      if (authError || !authUser?.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }

      userId = authUser.user.id;

      // Create user record
      const { error: userError } = await supabaseAdmin.from("users").insert({
        id: userId,
        strava_athlete_id: athlete.id,
        full_name: `${athlete.firstname} ${athlete.lastname}`,
        sex: athlete.sex,
      });

      if (userError) {
        // Clean up auth user if user creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create user record: ${userError.message}`);
      }
    }

    // Store tokens securely
    await supabaseAdmin.from("strava_tokens").upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

    await writeAuditLog({
      actorId: userId,
      action: "STRAVA_CONNECTED",
      entityType: "user",
      entityId: userId,
    });

    logInfo("Strava OAuth callback completed", { userId });

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    logError("OAuth callback failed", err);
    return new Response(JSON.stringify({ error: "OAuth error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
