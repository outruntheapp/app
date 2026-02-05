// supabase/functions/_shared/guards.ts
// Purpose: Defensive checks

export function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
