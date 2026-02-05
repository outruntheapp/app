// src/services/adminService.js
// Purpose: Admin-only participant management

import { supabase } from "./supabaseClient";
import { writeAuditLog } from "./auditService";

export async function excludeParticipant(adminId, participantId) {
  return setParticipantExcluded(adminId, participantId, true);
}

/**
 * Set participants.excluded to true or false (default false). Admins only.
 */
export async function setParticipantExcluded(adminId, participantId, excluded) {
  try {
    const { error } = await supabase
      .from("participants")
      .update({ excluded: !!excluded })
      .eq("id", participantId);

    if (error) throw error;

    await writeAuditLog({
      actorId: adminId,
      action: excluded ? "EXCLUDE_PARTICIPANT" : "INCLUDE_PARTICIPANT",
      entityType: "participant",
      entityId: participantId,
    });
  } catch (err) {
    console.error("Failed to set participant excluded", err);
    throw err;
  }
}
