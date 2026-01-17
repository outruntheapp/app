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

    const { error: updateError } = await supabaseAdmin
      .from("participants")
      .update({ excluded: true })
      .eq("id", participantId);

    if (updateError) {
      throw new Error(`Failed to exclude participant: ${updateError.message}`);
    }

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
