// supabase/functions/admin-exclude-user/index.ts
// Purpose: Exclude participant (admin-only)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { writeAuditLog } from "../_shared/audit.ts";
import { logInfo, logError } from "../_shared/logger.ts";

serve(async (req) => {
  try {
    const { participantId, adminId } = await req.json();

    if (!participantId || !adminId) {
      return new Response(
        JSON.stringify({ error: "Missing participantId or adminId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    logInfo("Excluding participant", { participantId, adminId });

    // Verify participant exists and get user_id
    const { data: participant, error: fetchError } = await supabaseAdmin
      .from("participants")
      .select("id, user_id, excluded")
      .eq("id", participantId)
      .single();

    if (fetchError || !participant) {
      return new Response(
        JSON.stringify({ error: "Participant not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (participant.excluded) {
      return new Response(
        JSON.stringify({ message: "Participant already excluded" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Update participant
    const { error: updateError } = await supabaseAdmin
      .from("participants")
      .update({ excluded: true })
      .eq("id", participantId);

    if (updateError) {
      throw new Error(`Failed to exclude participant: ${updateError.message}`);
    }

    // Write audit log (trigger will also fire, but we want explicit log)
    await writeAuditLog({
      actorId: adminId,
      action: "EXCLUDE_PARTICIPANT",
      entityType: "participant",
      entityId: participantId,
      metadata: {
        user_id: participant.user_id,
      },
    });

    logInfo("Participant excluded successfully", { participantId });

    return new Response(
      JSON.stringify({ success: true, participantId }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    logError("Failed to exclude participant", err);
    return new Response(
      JSON.stringify({ error: "Exclusion failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
