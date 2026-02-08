# outrun_poc/scripts — CLI helpers

## upload-routes.js — Upload GPX routes to Supabase

This script reads GPX files from `routes/{challenge_name}/` and converts them to PostGIS format for insertion into Supabase.

### Directory Structure

```
routes/
├── challenge_1/
│   ├── stage-1.gpx
│   ├── stage-2.gpx
│   └── stage-3.gpx
└── challenge_2/
    ├── stage-1.gpx
    ├── stage-2.gpx
    └── stage-3.gpx
```

### Usage

#### Option 1: Generate SQL File (Recommended for First Time)

```bash
npm run upload-routes challenge_1 sql
```

This generates a SQL migration file at:
`supabase/migrations/02_insert_routes_challenge_1.sql`

You can then review and run it in Supabase SQL Editor.

#### Option 2: Direct Upload to Supabase

```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upload directly
npm run upload-routes challenge_1 upload
```

Or use `.env.local`:
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then:
```bash
npm run upload-routes challenge_1 upload
```

### List Available Challenges

```bash
npm run upload-routes
```

This will list all challenge directories found in `routes/`.

### What It Does

1. Reads GPX files from `routes/{challenge_name}/stage-{1,2,3}.gpx`
2. Parses XML to extract track point coordinates
3. Converts to PostGIS LineString format (WKT)
4. Either:
   - Generates SQL INSERT statements, OR
   - Directly inserts into Supabase `routes` table

### Requirements

- Node.js installed
- GPX files in correct directory structure
- Active challenge in Supabase database (for direct upload)
- Supabase credentials (for direct upload)

### Notes

- The script automatically finds the active challenge in Supabase
- If a route already exists for a stage, it will update it
- Coordinates are converted from GPX format (lat, lon) to PostGIS format (lon, lat)
- Buffer meters default to 30m, overlap ratio to 0.8 (80%)

## ingest-strava-activity.js — Insert one activity for testing

Inserts a single activity from a JSON file (for testing route matching with real Strava-style data). See **instructions/TEST_STRAVA_RUNS.md**.

```bash
node scripts/ingest-strava-activity.js path/to/activity.json
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_*` / `SERVICE_ROLE_KEY`). JSON must include `user_id`, `polyline`, `started_at`, `elapsed_seconds`.

## set-existing-users-password.js — One-off: set password for existing users

Sets the auth password to `0000` for every user that has a row in `public.users`. Run once after enabling email/password sign-in so existing users can sign in with email + password `0000` (they should change it via “Forgot password” if needed).

```bash
# With env vars set (e.g. from .env.local)
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
node scripts/set-existing-users-password.js
```

Or with dotenv: `node -r dotenv/config scripts/set-existing-users-password.js` (with `dotenv` installed and `.env.local` in project root).

**Security:** Use only in a controlled environment; the script uses the **service role** key. Do not commit the key or run in public CI.

## sync-auth-email-from-public-users.js — One-off: sync auth email from public.users

Sets `auth.users.email` to `public.users.email` for every user that has a real email in `public.users` (skips placeholder emails like `*@strava.local`). Run once so that “Forgot password” and email/password sign-in work for users who were created via Strava OAuth (auth had a placeholder email).

Same env as other scripts: `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`).

```bash
node scripts/sync-auth-email-from-public-users.js
```

**Alternative: run inside Supabase** — Deploy the Edge Function `sync-auth-email` and invoke it once (e.g. from Supabase Dashboard → Edge Functions → sync-auth-email → Invoke, or via curl with `Authorization: Bearer <SERVICE_ROLE_KEY>`). Same logic, no local env needed.
