# OUTRUN — MVP / Proof of Concept

OUTRUN is a virtual running challenge web application that integrates with Strava to automatically validate runner activities against predefined GPX routes and compute deterministic leaderboards.

This repository represents a **validation-focused MVP / proof of concept**, designed to prove automation, verification, and competition mechanics — not to serve as a fully hardened production system.

---

## Core Principles

- Fully automated (no uploads, no submissions)
- Deterministic leaderboards (no manual ranking)
- Silent failure for invalid activities
- Minimal admin intervention
- Mobile-first web experience
- Audit-first backend design

---

## Tech Stack

- **Frontend**: React / Next.js / JavaScript / MUI
- **Backend & DB**: Supabase (Postgres + Edge Functions)
- **Maps & GPX**: Mapbox
- **Hosting**: Vercel
- **External API**: Strava

---

## Core schema (reference)

- **public.users**: `id` (uuid, PK, FK to auth.users), `strava_athlete_id` (unique), `full_name`, `sex`, `created_at`, `email` (unique), `role` (default `'participant'`; set to `'admin'` in DB for admin access). Synced from Supabase Auth; email/role added for ticketing and admin.
- **Challenges, participants, activities, stage_results, routes, audit_logs, strava_tokens**: See `outrun_poc/supabase/migrations/01_initial_schema.sql` and later migrations.

---

## Repository Structure

```txt
outrun_poc/
├── instructions/      # Documentation (deployment, setup, troubleshooting)
│   ├── DEMO_MODE.md
│   ├── DEPLOYMENT_QUICK_START.md  # Primary deployment checklist
│   ├── SUPABASE_DEPLOYMENT.md
│   ├── VERCEL_ENV_SETUP.md
│   ├── FIRST_RUN_CHECKLIST.md
│   ├── STRAVA_ERROR_FIX.md
│   ├── APP_FLOW_DIAGRAM.md
│   ├── EDGE_FUNCTIONS.md
│   ├── ERROR_LOGS_AND_DEBUGGING.md
│   ├── GPX_TO_ROUTES_PAGE_FLOW.md
│   ├── RUNNING_TESTS.md
│   └── ... (SQL_SCHEMA, TEST_STRAVA_RUNS, etc.)
│
├── public/
│   └── routes/             # GPX route files (e.g. challenge_1/stage-1.gpx)
│       └── <slug>/         # stage-1.gpx, stage-2.gpx, stage-3.gpx
│
├── src/
│   ├── components/        # Reusable UI components (no data access)
│   │   ├── auth/          # OAuth / Strava connect
│   │   ├── dashboard/     # Runner-facing components
│   │   ├── leaderboard/   # Public leaderboard components
│   │   ├── admin/         # Admin-only UI (participants, export)
│   │   └── common/        # Shared UI (header, countdown, rules)
│   │
│   ├── pages/             # Route-level pages (Next.js)
│   │   ├── index.js       # Landing / login
│   │   ├── dashboard.js   # Runner dashboard
│   │   ├── leaderboard.js # Public leaderboards
│   │   ├── routes.js      # Challenge routes with GPX maps
│   │   ├── admin.js       # Admin panel (challenges, audit logs, cron logs, re-import routes)
│   │   └── api/           # API routes
│   │       ├── admin/     # audit-logs, cron-audit-logs, reimport-routes, challenges
│   │       ├── routes.js  # Routes from GPX + sync to DB
│   │       ├── route-geometry.js
│   │       └── demo-polylines.js
│   │
│   ├── services/          # Business logic + Supabase access
│   │   ├── supabaseClient.js
│   │   ├── authService.js
│   │   ├── activityService.js
│   │   ├── leaderboardService.js
│   │   ├── routeService.js
│   │   ├── userService.js
│   │   └── ...
│   │
│   ├── lib/               # Server-only helpers
│   │   └── ensureChallengeRoutes.js  # GPX → WKT sync; forceSyncChallengeRoutesFromGpx for re-import
│   │
│   ├── utils/             # Pure helpers (no side effects)
│   │   ├── adminAuth.js   # Admin role / email allowlist
│   │   ├── demoMode.js
│   │   └── ...
│   │
│   ├── constants/
│   └── styles/
│       └── theme.js       # MUI theme (OUTRUN_BURNT, OUTRUN_WHITE, etc.)
│
├── supabase/
│   ├── functions/         # Edge functions (Deno/TypeScript)
│   │   ├── standalone/    # sync-strava-activities, process-activities, auth-*, init-demo-data
│   │   └── _shared/       # geo (matchesRoute), audit, supabase
│   └── migrations/       # SQL schema + match_activity_to_route, match_activity_to_route_debug
│
├── demo/                  # Demo mode data and polyline generation
└── scripts/               # One-off scripts (ingest-strava-activity, upload-routes)
```
---

## Architectural Rules

### Pages

* Own routing and layout
* Call components only
* No direct Supabase access

### Components

* Render UI only
* Call services via props or hooks
* Never write to database directly

### Services

* All Supabase reads/writes live here
* All `try/catch` lives here
* All audit logs originate here

### Utils

* Pure, stateless helpers
* No Supabase, no side effects

---

## Logging & Auditing

* Frontend uses centralized logging helpers
* Backend writes immutable audit logs
* Leaderboards are derived from views
* No manual result manipulation is supported

---

## MVP Scope Constraints (Intentional)

* One active challenge at a time (but structure to easily do multiple in the future)
* No payments (ticket purchase flow planned but not implemented)
* No notifications
* No manual activity approval 
* No activity-level edits
* Admins may only exclude participants
* **Demo Mode**: Available in production for testing without Strava API approval

These constraints preserve determinism and auditability.

---

## Extending Beyond MVP

This architecture cleanly supports future additions:

* Multiple concurrent challenges
* Ticketing / payment gating
* Notifications
* Appeals tooling
* Historical challenges

Without refactoring core logic.

---

## Styling

* App Background: ./src/assets/splash.png
* Primary background colour: #C45A2A
* Secondary background colour: #2A2A2A
* Text colours: #F4F1EC and #0B0B0B
* Branded header for pages: ./src/assets/header.png

---

# What Is STILL Outstanding (Final Truth List)

---

## 🔴 Required (Cannot Launch Without)

1. **Strava App Approval**

   * External dependency
   * Timeline risk

2. **Supabase Project Setup**

   * Create project
   * Apply SQL schema
   * Enable extensions (`pg_cron`, `net`)

3. **Environment Variables**

   * Populate real secrets
   * Deploy Edge Functions

4. **GPX routes**

   * Place GPX files in `public/routes/<slug>/stage-1.gpx` (and 2, 3). Use Admin "Re-import routes from GPX" or GET `/api/routes` to sync into `routes` (WKT → `gpx_geo` + `polyline`).

---

## 🟡 Strongly Recommended (Before Public Use)

5. **Single Active Challenge Enforcement**

   * DB constraint or trigger

6. **Strava Webhooks**

   * Reduce polling
   * Faster updates

7. **Basic Monitoring**

   * Supabase logs
   * Cron failure alerts

---

## 🟢 Explicitly NOT Required for MVP

* Payments
* Notifications
* Appeals
* Manual approvals
* Mobile apps
* Social features

---

# ✅ Final Status

**At this point:**

* 🧱 Architecture is locked
* 🔐 Security is correct
* 🔁 Automation is real
* 🧾 Auditing is complete
* 🧠 Logic is deterministic
* 📦 Remaining work is wiring + approvals
* 🎨 UI/UX improvements completed (landing page, demo mode, participant validation)
* 📚 Documentation organized in `instructions/` directory

> This is now a **legitimate, defensible MVP/POC**, not a prototype.

---

## Recent Updates

### Session & Auth
- **Return sign-in**: `auth-return-signin` Edge Function + client `verifyOtp` so users with existing Strava link get a session when clicking ENTER (no re-OAuth).
- **Strava OAuth callback**: Returns magic-link token so client can establish session after first-time Strava auth.
- **Session isolation**: Logout clears stored email and reloads; callback and landing clear stored email to avoid data leak when switching users in same browser.
- **Reconnect Strava**: Dashboard shows "Reconnect Strava" when user has Strava link but no valid token; RPCs `check_strava_connection_by_email` and `get_strava_connection_status` used instead of direct `users` queries (RLS-safe).

### Admin
- **Admin access**: Header "Admin" link (far left) for users with `users.role = 'admin'` (set manually in DB). Admin page: Challenges, Audit logs, Participants, **Cron logs**.
- **Cron logs tab**: GET `/api/admin/cron-audit-logs`; Admin tab shows `cron_audit_logs` (run_id, job_name, status, metadata).
- **Scheduled jobs (cron)**: `sync-strava-activities` and `process-activities` run automatically via pg_cron + pg_net. Run **`outrun_poc/supabase/sql/cron_schedule.sql`** once in SQL Editor (after replacing PROJECT_REF and SERVICE_ROLE_KEY with values from SUPABASE_URL and SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY). Requires migration 14 (pg_net). Default: hourly; file comments explain daily schedule.
- **Re-import routes from GPX**: Per-challenge button on Challenges tab; POST `/api/admin/reimport-routes` with `challenge_id`; uses `forceSyncChallengeRoutesFromGpx` to re-run sync from `public/routes/<slug>/stage-*.gpx`.

### Route Matching
- **routes.polyline**: Migration 12 adds `routes.polyline` (Google encoded, precision 5). `sync_challenge_routes_from_wkt` sets it from WKT; backfill for existing rows. Strava activity polylines and route polylines use same format; no conversion needed.
- **match_activity_to_route**: Uses `routes.polyline` when present (decode with precision 5); fallback encode/decode from `gpx_geo`. Guards for null/empty/zero-length; buffer and overlap ratio unchanged.
- **match_activity_to_route_debug**: Migration 13 adds diagnostic RPC returning `activity_point_count`, `route_polyline_used`, `route_point_count`, `overlap_ratio`, `matched` for debugging.

### Demo Mode & Landing
- Demo mode: Toggle on landing; see `instructions/DEMO_MODE.md`.
- Landing: Join Challenge reveals Strava connect; ENTER for return sign-in. No ticket flow yet.

---

## Quick Start

1. **Deploy**: `outrun_poc/instructions/DEPLOYMENT_QUICK_START.md` (Supabase + Vercel). For full verification order use `FIRST_RUN_CHECKLIST.md`.
2. **Env**: `VERCEL_ENV_SETUP.md` (Vercel); Supabase secrets per `SUPABASE_DEPLOYMENT.md`.
3. **Demo**: Click "Demo Mode OFF" on landing to test without Strava; see `DEMO_MODE.md`.
4. **Flow**: `APP_FLOW_DIAGRAM.md` — app flow and roles. Troubleshooting: `STRAVA_ERROR_FIX.md`.
5. **Tests**: `instructions/RUNNING_TESTS.md`. **Route matching debug**: Call `match_activity_to_route_debug(activity_polyline, route_id)` in SQL to get overlap_ratio and point counts; see `instructions/GPX_TO_ROUTES_PAGE_FLOW.md` and `TEST_STRAVA_RUNS.md`.
