// Standalone version for Supabase Dashboard deployment
// Copy this entire file into Supabase Dashboard → Edge Functions → Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Shared Code (inlined)
// ============================================================================

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

async function writeAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });
}

// ============================================================================
// Main Function
// ============================================================================

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
    const { code, userEmail } = await req.json();

    if (!code) {
      return new Response("Missing OAuth code", { status: 400 });
    }

    // Check if this is a demo OAuth (special code or header)
    const isDemo = (typeof code === "string" && code.startsWith("demo_code_")) ||
                   req.headers.get("x-demo-mode") === "true";

    logInfo("Processing Strava OAuth callback", { 
      code: code.substring(0, 10),
      hasUserEmail: !!userEmail,
      isDemo,
    });

    let tokenData: any;
    let athlete: any;

    if (isDemo) {
      // Demo mode: Use demo athlete data instead of real Strava API
      const DEMO_STRAVA_ATHLETE_ID = 999999999;
      
      athlete = {
        id: DEMO_STRAVA_ATHLETE_ID,
        firstname: "Demo",
        lastname: "Runner",
        sex: null,
      };
      
      // Mock token data for demo
      tokenData = {
        access_token: "demo_access_token",
        refresh_token: "demo_refresh_token",
        expires_at: Math.floor(Date.now() / 1000) + 21600, // 6 hours from now
        athlete,
      };
      
      logInfo("Using demo athlete data", { athleteId: DEMO_STRAVA_ATHLETE_ID });
    } else {
      // Normal Strava OAuth flow
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

      tokenData = await tokenRes.json();
      athlete = tokenData.athlete;
    }

    let userId: string;

    // CRITICAL: Only match by strava_athlete_id - NEVER by email
    // This ensures deterministic, one-to-one mapping: one Strava athlete = one Supabase user
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("strava_athlete_id", athlete.id)
      .single();

    if (existingUser) {
      userId = existingUser.id;
      logInfo("Found existing user by strava_athlete_id", { userId, athleteId: athlete.id });
      
      // Update user info
      const updateData: {
        full_name: string;
        sex: string | null;
        email?: string;
      } = {
        full_name: `${athlete.firstname} ${athlete.lastname}`,
        sex: athlete.sex,
      };
      
      // Only update email if:
      // 1. User-provided email exists
      // 2. Current user has no email OR email matches provided email
      // 3. No other user has this email
      if (userEmail && typeof userEmail === "string" && userEmail.trim()) {
        const trimmedEmail = userEmail.trim().toLowerCase();
        
        // Check if email is already taken by another user
        const { data: emailUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", trimmedEmail)
          .neq("id", userId)
          .single();
        
        if (emailUser) {
          logInfo("Email already taken by another user, skipping email update", {
            email: trimmedEmail,
            existingUserId: userId,
            emailOwnerId: emailUser.id,
          });
        } else if (!existingUser.email || existingUser.email === trimmedEmail) {
          // Safe to set/update email
          updateData.email = trimmedEmail;
          logInfo("Updating user email", { userId, email: trimmedEmail });
        } else {
          logInfo("User already has different email, preserving existing email", {
            userId,
            existingEmail: existingUser.email,
            providedEmail: trimmedEmail,
          });
        }
      }
      
      await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", userId);
    } else {
      // Create auth user first using Admin API
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

      // Create user record with email if provided and not already taken
      const userData: {
        id: string;
        strava_athlete_id: number;
        full_name: string;
        sex: string | null;
        email?: string;
      } = {
        id: userId,
        strava_athlete_id: athlete.id,
        full_name: `${athlete.firstname} ${athlete.lastname}`,
        sex: athlete.sex,
      };
      
      // Store provided email if available and not already taken by another user
      if (userEmail && typeof userEmail === "string" && userEmail.trim()) {
        const trimmedEmail = userEmail.trim().toLowerCase();
        
        // Check if email is already taken
        const { data: emailUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", trimmedEmail)
          .single();
        
        if (!emailUser) {
          // Email is available, safe to use
          userData.email = trimmedEmail;
          logInfo("Setting user email on creation", { userId, email: trimmedEmail });
        } else {
          logInfo("Email already taken, creating user without email", {
            userId,
            email: trimmedEmail,
            existingUserId: emailUser.id,
          });
        }
      }
      
      const { error: userError } = await supabaseAdmin.from("users").insert(userData);

      if (userError) {
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

    // Get active challenge and ensure participant record exists
    const { data: activeChallenge } = await supabaseAdmin
      .from("challenges")
      .select("id")
      .eq("is_active", true)
      .single();

    if (activeChallenge) {
      const { data: existingParticipant } = await supabaseAdmin
        .from("participants")
        .select("id")
        .eq("user_id", userId)
        .eq("challenge_id", activeChallenge.id)
        .single();

      if (!existingParticipant) {
        await supabaseAdmin.from("participants").insert({
          user_id: userId,
          challenge_id: activeChallenge.id,
          excluded: false,
        });
        logInfo("Created participant record during Strava auth", { userId });
      }
    }

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
