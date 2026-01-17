// src/services/adminService.js
// Purpose: Admin-only participant management

import { supabase } from "./supabaseClient";
import { writeAuditLog } from "./auditService";

export async function excludeParticipant(adminId, participantId) {
  try {
    const { error } = await supabase
      .from("participants")
      .update({ excluded: true })
      .eq("id", participantId);

    if (error) throw error;

    await writeAuditLog({
      actorId: adminId,
      action: "EXCLUDE_PARTICIPANT",
      entityType: "participant",
      entityId: participantId,
    });
  } catch (err) {
    console.error("Failed to exclude participant", err);
    throw err;
  }
}
