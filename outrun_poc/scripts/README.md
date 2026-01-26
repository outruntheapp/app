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
