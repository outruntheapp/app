# Where to Find Errors and Logs

This app logs errors and key events so you can see where flow blocks or fails.

## Browser (client)

- **Console:** Open DevTools (F12 or Cmd+Option+I) → Console. Look for:
  - `[ERROR]` – from `src/utils/logger.js` (e.g. route fetch failed, API failed).
  - `[INFO]` – e.g. "fetchActiveChallengeRoutes: loaded routes from API", "RouteMap: no route passed", "RouteMap: no usable gpx_geo for map" (explains why the map did or didn’t render).
- **Network:** DevTools → Network. Check `/api/routes` and `/api/demo-polylines` – status 200 vs 4xx/5xx and response body.

## Next.js API routes (server)

- **Local:** Terminal where you run `npm run dev`. Logs are prefixed with:
  - `[Routes API]` – GPX fetch/fs fallback, sync RPC result, and handler errors.
- **Vercel:** Project → Deployments → select deployment → Functions → select the function (e.g. `api/routes`) → Logs. Same prefixes; use them to see blocks (e.g. "fetch GPX failed, trying fs", "sync RPC failed").

## Supabase

- **Database:** Table `audit_logs` – app and Edge Functions write actions (e.g. Strava connected, stage completed, participant excluded). Query by `action` or `created_at`.
- **Edge Functions:** Dashboard → Edge Functions → select function → Logs. Used by auth-strava-callback, sync-strava-activities, process-activities, init-demo-data.
- **Postgres:** SQL Editor – run `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;` to inspect recent audit trail.

## Summary

| Where something fails      | Where to look |
|----------------------------|----------------|
| Routes page / map not showing | Browser console ([INFO]/[ERROR] from routeService, RouteMap); Network tab for /api/routes. |
| API routes (e.g. /api/routes) | Dev server terminal or Vercel function logs; messages start with `[Routes API]`. |
| Auth / Strava / sync       | Supabase Edge Function logs; browser console for client errors. |
| Who did what (audit)       | Supabase table `audit_logs`. |
