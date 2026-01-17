// Standalone version for Supabase Dashboard deployment
// Copy this entire file into Supabase Dashboard → Edge Functions → Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({ message: "Leaderboards are derived via views" }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
