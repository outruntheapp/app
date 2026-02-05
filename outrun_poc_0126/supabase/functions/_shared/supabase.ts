// supabase/functions/_shared/supabase.ts
// Purpose: Admin Supabase client for Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseAdmin = createClient(
  Deno.env.get("DB_URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);
