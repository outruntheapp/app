// supabase/functions/demo-auth/index.ts
// Purpose: Create or get demo user auth session and return session token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { logInfo, logError } from "../_shared/logger.ts";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";
const DEMO_USER_EMAIL = "demo@outrun.local";

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
    logInfo("Creating demo auth session");

    // Check if demo user exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let demoUser = existingUsers?.users?.find((u) => u.id === DEMO_USER_ID || u.email === DEMO_USER_EMAIL);

    // If demo user doesn't exist, create it
    if (!demoUser) {
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        email_confirm: true,
        user_metadata: {
          full_name: "Demo Runner",
          is_demo: true,
        },
      });

      if (authError || !newUser?.user) {
        throw new Error(`Failed to create demo auth user: ${authError?.message}`);
      }

      demoUser = newUser.user;
      logInfo("Created demo auth user", { userId: demoUser.id });
    }

    // For demo mode, use a known password approach
    // The demo user is created with a known password in init-demo-data
    // Client will sign in with email and password
    const DEMO_PASSWORD = Deno.env.get("DEMO_USER_PASSWORD") || "demo-password-123";
    
    logInfo("Demo auth session prepared", { userId: demoUser.id });

    // Return user credentials for client-side sign-in
    // Client will use supabase.auth.signInWithPassword() with these credentials
    return new Response(
      JSON.stringify({
        success: true,
        userId: demoUser.id,
        email: demoUser.email,
        password: DEMO_PASSWORD, // Return password for client sign-in
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Failed to create demo auth session", err);
    return new Response(
      JSON.stringify({ error: "Failed to create demo auth session", details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
