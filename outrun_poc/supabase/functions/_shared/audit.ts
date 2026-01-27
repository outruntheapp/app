// supabase/functions/_shared/audit.ts
// Purpose: Write immutable audit logs

import { supabaseAdmin } from "./supabase.ts";

export async function writeAuditLog({
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
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: actorId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata,
    });
  } catch (err) {
    // Swallow error - audit logging must not block workflow
    console.error("Audit log write failed (non-blocking):", err);
  }
}
