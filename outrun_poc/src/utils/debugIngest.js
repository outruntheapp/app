// Only used in development; never calls localhost or any URL in production.
const INGEST_UUID = "af0ed011-60a4-4d80-97ca-239e912ff0b5";

/**
 * Send debug payload to ingest endpoint only in development.
 * In production this is a no-op. Never uses 127.0.0.1 or localhost in production code.
 * @param {string} location
 * @param {string} message
 * @param {object} [data]
 */
export function debugIngest(location, message, data = {}) {
  if (process.env.NODE_ENV !== "development") return;
  const base = process.env.NEXT_PUBLIC_INGEST_BASE_URL;
  if (!base || typeof base !== "string" || base.includes("127.0.0.1")) return;
  const url = `${base.replace(/\/$/, "")}/ingest/${INGEST_UUID}`;
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H4,H5",
      }),
    }).catch(() => {});
  } catch (_) {}
}
