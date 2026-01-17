// supabase/functions/_shared/logger.ts
// Purpose: Structured logging for Edge runtime

export function logInfo(message: string, meta: unknown = {}) {
  console.log(JSON.stringify({ level: "info", message, meta }));
}

export function logError(message: string, error: unknown) {
  console.error(JSON.stringify({ level: "error", message, error }));
}
