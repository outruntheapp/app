// src/services/auditService.js
// Purpose: Write immutable audit logs to Supabase

import { supabase } from "./supabaseClient";
import { logError } from "../utils/logger";

export async function writeAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
}) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });

    if (error) throw error;
  } catch (err) {
    logError("Failed to write audit log", err);
  }
}
