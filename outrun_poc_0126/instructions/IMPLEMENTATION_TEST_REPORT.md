# Implementation test report (read-only)

Report generated from static analysis and build/lint runs. No code was changed for this report.

## Build and lint

- **Build**: `npm run build` completes successfully. All pages compile; `/api/routes` is dynamic (λ).
- **Lint**: `next lint` runs; no automated test suite is defined in `package.json`.

---

## Flow: would it function?

### 1. Landing → Join → Email → Connect Strava / ENTER

- **Join Challenge**: Shows email input; no Strava button before email (after change: only in email step).
- **Continue**: Calls `checkStravaConnectionByEmail(email)` → RPC `check_strava_connection_by_email`. Requires migration `04_check_strava_by_email.sql` and `grant execute` to `anon`/`authenticated`. Without it: 406/42883, UI shows “Failed to check connection”.
- **Connect Strava**: Redirects to Strava with `client_id`, `redirect_uri`, `scope=read,activity:read`. Requires `NEXT_PUBLIC_STRAVA_CLIENT_ID` and matching redirect in Strava app. Callback calls Edge `auth-strava-callback` with anon key; function uses service role for user/participant/tokens. Works if Edge is deployed and env (e.g. `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`) is set.
- **ENTER** (has Strava): Goes to dashboard; dashboard uses `fetchCurrentUser()` (auth + `users` by id). Works if session exists and `users` row exists.

**Verdict**: Works end-to-end if Supabase migrations (01, 04, 05, 06) and Edge `auth-strava-callback` are deployed and Strava app env is set. RPC missing → email check fails.

### 2. Dashboard

- **Data**: `RunnerSummaryCard` / `StageProgressList` / `RankCard` use `fetchCurrentUser()`, `fetchActiveChallenge()`, `fetchUserStageResults(userId, challengeId)`, `fetchUserRank(userId, challengeId)`.
- **Auth**: Real auth user preferred over demo (userService checks `auth.getUser()` and `id !== DEMO_USER_ID`).
- **RLS**: Dashboard reads `users` (self + leaderboard policies), `stage_results`, `participants`, `leaderboard_overall`. Migration 05 must be applied or leaderboard/rank may be empty for non-demo users.

**Verdict**: Works if user is authenticated and migrations 01 + 05 (and 06 if backfill needed) are applied.

### 3. Leaderboard

- **Data**: `fetchOverallLeaderboard()` / `fetchStageLeaderboard(stage)` read views `leaderboard_overall`, `leaderboard_stage`.
- **RLS**: Policies `users_read_leaderboard`, `participants_read_leaderboard`, `stage_results_read_leaderboard` (05) must exist so authenticated users can read all rows for the views.

**Verdict**: Works if migration 05 is applied. Without it, views return only the current user’s row.

### 4. Routes page

- **Data**: `fetchActiveChallengeRoutes()` tries Supabase `routes` for active challenge, then fallback `GET /api/routes`.
- **API route**: Reads `routes/challenge_1/stage-1.gpx`, `stage-2.gpx`, `stage-3.gpx` from `process.cwd()`. In Vercel, `process.cwd()` is the deployment root; files must be present in the deployed bundle (no serverless exclude of `routes/`).

**Verdict**: Works if either (a) `routes` table has rows for the active challenge, or (b) `routes/challenge_1/*.gpx` exist in the deployed app and `/api/routes` is used. Vercel must include `routes/` in the build.

### 5. Strava sync and process-activities

- **sync-strava-activities**: Cron; needs service role, `strava_tokens` table, and Strava API refresh. Not called from frontend.
- **process-activities**: Cron; reads `routes` and unprocessed `activities`, calls RPC `match_activity_to_route(activity_polyline, route_id)`. Requires `match_activity_to_route.sql` (PostGIS). Route geometry must be in DB (e.g. from `scripts/upload-routes.js` or migration 02); stub LINESTRINGs in 02 may not match real runs.

**Verdict**: Works if cron is scheduled, Edge functions deployed, and `routes.gpx_geo` populated from real GPX (e.g. upload-routes or seed script). Matching quality depends on geometry in DB.

### 6. Connect Strava button visibility (after change)

- **Landing**: Strava (Connect / ENTER) is shown only when `showEmailInput === true` and `hasStrava !== null` (i.e. after user enters email and clicks Continue). No Connect button before email.
- **Dashboard**: Does not render StravaConnectButton; no change.

**Verdict**: Matches requirement: “Connect with Strava” only after email entered and only when not yet authenticated (or show ENTER when hasStrava).

---

## Summary

| Area              | Would function? | Dependency |
|-------------------|-----------------|------------|
| Landing + OAuth   | Yes             | Migrations 01, 04; Edge auth-strava-callback; Strava env |
| Dashboard         | Yes             | Auth session; migrations 01, 05 (06 for backfill) |
| Leaderboard       | Yes             | Migration 05 (RLS for views) |
| Routes page       | Yes             | DB routes or /api/routes + routes/challenge_1/*.gpx in deploy |
| Activity pipeline | Yes             | Cron + Edge sync/process + match_activity_to_route + routes seeded from GPX |

`package.json` includes a `test` script (Jest; unit tests in `__tests__/polyline.test.js`). Manual E2E and deployed-env checks (Vercel + Supabase) still recommended for production.
