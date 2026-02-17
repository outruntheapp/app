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

- **public.users**: `id` (uuid, PK, FK to auth.users), `strava_athlete_id` (unique), `full_name`, `sex`, `created_at`, `email` (unique), `role` (default `'participant'`; set to `'admin'` in DB for admin access), `id_number` (optional, from sign-up). Synced from Supabase Auth.
- **challenges**: `slug` (unique, not null), one active challenge enforced via partial unique index.
- **challenge_ticket_holders**: Per-challenge allowlist (`challenge_id`, `email`, `name`, `id_number`, `ticket_type`); gates participant creation unless `users.role = 'admin'`. Populated via Admin CSV upload. `ticket_type` is used for leaderboard icons (⚪️ basic, 🟠 premium, ⚫️ apex).
- **participants, activities, stage_results, routes, audit_logs, strava_tokens, cron_audit_logs**: See `outrun_poc/supabase/migrations/01_initial_schema.sql` (consolidated schema for new projects). Incremental migrations 02–19 exist for existing DBs.

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
│   │   ├── index.js       # Landing: sign-in (email+password), sign-up, forgot password, Enter / Join Challenge
│   │   ├── dashboard.js   # Runner dashboard
│   │   ├── leaderboard.js # Public leaderboards
│   │   ├── routes.js      # Challenge routes with GPX maps
│   │   ├── admin.js       # Admin panel (challenges, ticket holders CSV, audit/cron logs, re-import routes)
│   │   ├── auth/
│   │   │   └── callback.js # Strava OAuth callback + password recovery (set new password)
│   │   └── api/           # API routes
│   │       ├── admin/     # audit-logs, cron-audit-logs, ticket-holders, reimport-routes, challenges
│   │       ├── auth/      # signup (POST, creates auth user + public.users row)
│   │       ├── join-active-challenge.js # Gated by challenge_ticket_holders; admins bypass
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
│   │   ├── ensureChallengeRoutes.js  # GPX → WKT sync; forceSyncChallengeRoutesFromGpx for re-import
│   │   └── ticketValidation.js       # Check challenge_ticket_holders for join/participant gating
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
│   │   ├── auth-strava-callback/   # Strava OAuth; syncs auth email from public.users
│   │   ├── auth-return-signin/     # Magic-link return sign-in (Strava already linked)
│   │   ├── sync-auth-email/        # One-off: set auth.users.email from public.users (password recovery)
│   │   ├── set-existing-users-password/ # One-off: set all users' password to 000000
│   │   ├── standalone/   # Dashboard-deployable copies (no _shared): auth-*, sync-*, process-*, etc.
│   │   └── _shared/      # geo, audit, supabase, ticketValidation
│   └── migrations/       # 01_initial_schema.sql (full schema); 02–19 incremental
│
├── demo/                  # Demo mode data and polyline generation
└── scripts/               # One-off scripts (see scripts/README.md)
│   ├── upload-routes.js
│   ├── ingest-strava-activity.js
│   ├── set-existing-users-password.js   # Set auth password to 0000 for all public.users
│   └── sync-auth-email-from-public-users.js # Set auth.users.email from public.users (recovery)
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

* One active challenge at a time (enforced in DB; structure supports multiple later)
* Ticketing via **challenge_ticket_holders**: Admin uploads CSV (name, email, ID number, type) per challenge; only listed users (or admins) can join. No in-app payment; purchase is external (e.g. Racepass). Ticket `type` is used for leaderboard icons (⚪️ basic, 🟠 premium, ⚫️ apex).
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

   * Populate real secrets (Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRAVA_*`, `APP_BASE_URL`; Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`)
   * Deploy Edge Functions

4. **Auth redirect URLs**

   * Supabase Dashboard → Authentication → URL Configuration: add your app callback (e.g. `https://your-app.com/auth/callback`, `http://localhost:3000/auth/callback`) for OAuth and password recovery.

6. **GPX routes**

   * Place GPX files in `public/routes/<slug>/stage-1.gpx` (and 2, 3). Use Admin "Re-import routes from GPX" or GET `/api/routes` to sync into `routes` (WKT → `gpx_geo` + `polyline`). First challenge must have a `slug` (e.g. `challenge_1`); see `01_initial_schema.sql` and migrations.

---

## 🟡 Strongly Recommended (Before Public Use)

5. **Strava Webhooks**

   * Reduce polling
   * Faster updates

6. **Basic Monitoring**

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

### Auth (email + password)
- **Landing**: Sign in (email + password), Sign up (ID number, email, password → then Strava link), Forgot password. When signed in: **Enter** (→ dashboard) or **Join [Challenge]** (gated by ticket).
- **Sign-up**: POST `/api/auth/signup` creates auth user + `public.users` row; client then signs in and starts Strava OAuth. **Sign-in**: email + password only (no Strava on landing).
- **Password recovery**: Forgot password → Supabase email → `/auth/callback`; `PASSWORD_RECOVERY` shows “Set new password” form; then redirect to dashboard. Redirect URL must be in Supabase Auth URL config.
- **Auth email sync**: Users created via Strava had placeholder `auth.users.email` (`strava_*@strava.local`). Script `sync-auth-email-from-public-users.js` and Edge Function `sync-auth-email` set `auth.users.email` from `public.users.email` so recovery and email sign-in work. Callback and return-signin keep auth email in sync for new flows.
- **One-off passwords**: Script `set-existing-users-password.js` and Edge Function `set-existing-users-password` set all users’ password to `000000` (run once after enabling email auth). See `outrun_poc/scripts/README.md`.

### Session & Strava
- **Return sign-in**: `auth-return-signin` Edge Function + client `verifyOtp` for users with existing Strava link (ENTER, no re-OAuth).
- **Strava OAuth callback**: Returns magic-link token; syncs auth email when real email exists in `public.users`.
- **Reconnect Strava**: Dashboard “Reconnect Strava” when user has Strava link but no valid token; RPCs `check_strava_connection_by_email` and `get_strava_connection_status` (RLS-safe).

### Admin
- **Admin access**: Users with `users.role = 'admin'` (set in DB). Admin: Challenges, **Ticket holders** (CSV upload per challenge), Participants, Audit logs, Cron logs, Re-import routes.
- **Ticket holders**: POST `/api/admin/ticket-holders` with `challenge_id` and CSV (columns: name, email, ID number, type). Upserts into `challenge_ticket_holders` (stores `ticket_type` as `basic|premium|apex`). Join and Strava callback gated: only listed email (or admin) can become participant. Ticket type is shown in Admin → Participants and as icons on leaderboards (⚪️ basic, 🟠 premium, ⚫️ apex).
- **Cron**: `sync-strava-activities`, `process-activities` via pg_cron + pg_net. Run `outrun_poc/supabase/sql/cron_schedule.sql` once (replace PROJECT_REF and SERVICE_ROLE_KEY). Requires pg_net (in `01_initial_schema.sql`).

### Schema & Scripts
- **01_initial_schema.sql**: Single-file consolidated schema for new projects (users, challenges with slug, routes with polyline, challenge_ticket_holders with id_number, cron_audit_logs, RLS, views, RPCs). Migrations 02–17 remain for incremental updates.
- **challenge_ticket_holders**: Column `id_number` (renamed from `rsa_id`); CSV upload accepts “ID number” / “RSA ID” etc.

### Route Matching & Demo
- **routes.polyline**: Google encoded (precision 5); `sync_challenge_routes_from_wkt` sets it; used for Strava activity matching.
- **match_activity_to_route_debug**: Diagnostic RPC for overlap and point counts.
- **Demo mode**: Supported for testing without Strava API approval; see `instructions/DEMO_MODE.md` (there is no landing-page toggle).

---

## Quick Start

1. **Deploy**: `outrun_poc/instructions/DEPLOYMENT_QUICK_START.md` (Supabase + Vercel). Full verification: `FIRST_RUN_CHECKLIST.md`.
2. **Schema**: New project: run `outrun_poc/supabase/migrations/01_initial_schema.sql`. Existing: run migrations 02–19 as needed.
3. **Env**: `VERCEL_ENV_SETUP.md` (Vercel); Supabase secrets per `SUPABASE_DEPLOYMENT.md`. Set Auth redirect URLs for `/auth/callback` (OAuth + password recovery).
4. **Auth**: Sign-in is email + password. Sign-up creates account then links Strava. One-off: run `scripts/set-existing-users-password.js` and/or `scripts/sync-auth-email-from-public-users.js` (or Edge Functions) if migrating from Strava-only users; see `outrun_poc/scripts/README.md`.
5. **Admin**: Set `users.role = 'admin'` in DB for admin access. Upload ticket holders CSV per challenge to gate who can join.
6. **Demo**: See `DEMO_MODE.md` for how to enable demo mode (no landing-page toggle).
7. **Flow & tests**: `APP_FLOW_DIAGRAM.md`; troubleshooting `STRAVA_ERROR_FIX.md`; tests `RUNNING_TESTS.md`. Route debug: `match_activity_to_route_debug(...)` in SQL; see `GPX_TO_ROUTES_PAGE_FLOW.md` and `TEST_STRAVA_RUNS.md`.
