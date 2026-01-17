# Supabase Deployment Guide

This guide walks you through deploying the SQL schema, Edge Functions, and Postgres functions to your Supabase project.
 
## Prerequisites

1. **Supabase Project Created**
   - Go to https://supabase.com/dashboard
   - Create a new project or use existing one
   - Note down:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - Anon Key (found in Settings → API)
     - Service Role Key (found in Settings → API - keep this secret!)

2. **Supabase CLI (Optional but Recommended)**
   ```bash
   # Install via Homebrew (macOS)
   brew install supabase/tap/supabase
   
   # Or via npm
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   ```

## Step 1: Apply SQL Schema

### Option A: Via Supabase Dashboard (Recommended for First Time)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `SQL_SCHEMA.md` in this repo
4. Copy and paste each section **in order**:

#### 1.1 Extensions
```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "postgis"; -- For route matching
```

#### 1.2 Core Tables
Copy all table creation statements from `SQL_SCHEMA.md`:
- `users`
- `challenges`
- `participants`
- `activities`
- `stage_results`
- `audit_logs`
- `strava_tokens`
- `routes`

#### 1.3 Views
- `leaderboard_overall`
- `leaderboard_stage`

#### 1.4 RLS Policies
Enable RLS and create all policies as specified

#### 1.5 Triggers
- `log_participant_exclusion` function and trigger

### Option B: Via Supabase CLI

```bash
# If you have Supabase CLI installed and linked
cd supabase/migrations
supabase db push
```

## Step 2: Create Postgres Function for Route Matching

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `supabase/migrations/match_activity_to_route.sql`
3. Copy and paste the entire file
4. Click **Run**

**Note:** This function requires PostGIS extension. If you get an error about `ST_LineFromEncodedPolyline`, you may need to:
- Install PostGIS extension (should be available by default in Supabase)
- Or use an alternative polyline decoding approach

## Step 3: Deploy Edge Functions

### Option A: Via Supabase Dashboard (Recommended for First Time)

**⚠️ IMPORTANT:** When deploying via Dashboard, you must use the **standalone versions** which have all shared code inlined. The regular versions with `_shared/` imports will fail.

1. Go to **Edge Functions** in your Supabase dashboard
2. For each function, click **Create Function** and paste the code:

**Use files from `supabase/functions/standalone/` directory:**

1. **auth-strava-callback**
   - Copy **entire contents** from `supabase/functions/standalone/auth-strava-callback.ts`
   - Function name: `auth-strava-callback`

2. **sync-strava-activities**
   - Copy **entire contents** from `supabase/functions/standalone/sync-strava-activities.ts`
   - Function name: `sync-strava-activities`

3. **process-activities**
   - Copy **entire contents** from `supabase/functions/standalone/process-activities.ts`
   - Function name: `process-activities`

4. **admin-exclude-user**
   - Copy **entire contents** from `supabase/functions/standalone/admin-exclude-user.ts`
   - Function name: `admin-exclude-user`

5. **refresh-leaderboards**
   - Copy **entire contents** from `supabase/functions/standalone/refresh-leaderboards.ts`
   - Function name: `refresh-leaderboards`

**Why standalone?** The Dashboard doesn't automatically bundle the `_shared/` directory. The standalone versions include all shared code inline, making them ready to deploy.

### Option B: Via Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/outrun_poc

# Deploy all functions
supabase functions deploy auth-strava-callback
supabase functions deploy sync-strava-activities
supabase functions deploy process-activities
supabase functions deploy admin-exclude-user
supabase functions deploy refresh-leaderboards
```

**Note:** The shared modules (`_shared/`) will be automatically included when deploying via CLI.

## Step 4: Configure Environment Variables

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following environment variables:

```
DB_URL=https://your-project-ref.supabase.co
SERVICE_ROLE_KEY=your-service-role-key-here
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
APP_BASE_URL=https://your-app-domain.com
```

**Important:**
- `DB_URL` should be your Supabase project URL
- `SERVICE_ROLE_KEY` is found in Settings → API (keep secret!)
- `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` from your Strava app
- `APP_BASE_URL` is your frontend URL (e.g., `https://outrun.app`)

## Step 5: Set Up Cron Jobs

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the following SQL (replace `PROJECT_ID` with your actual project reference):

```sql
-- Schedule Strava sync (every 30 minutes)
select cron.schedule(
  'sync-strava',
  '*/30 * * * *',
  $$ 
  select net.http_post(
    url := 'https://PROJECT_ID.supabase.co/functions/v1/sync-strava-activities',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )::text
  $$
);

-- Schedule activity processing (every 30 minutes)
select cron.schedule(
  'process-activities',
  '*/30 * * * *',
  $$ 
  select net.http_post(
    url := 'https://PROJECT_ID.supabase.co/functions/v1/process-activities',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )::text
  $$
);
```

**Note:** Replace:
- `PROJECT_ID` with your Supabase project reference (e.g., `ndfgymfsszgqjauhyycv`)
- `YOUR_SERVICE_ROLE_KEY` with your actual service role key

## Step 6: Verify Deployment

### 6.1 Check Functions
1. Go to **Edge Functions** in dashboard
2. Verify all 5 functions are listed and deployed

### 6.2 Check Database
Run in SQL Editor:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'challenges', 'participants', 'activities', 'stage_results', 'audit_logs', 'strava_tokens', 'routes');

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('leaderboard_overall', 'leaderboard_stage');

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'match_activity_to_route';
```

### 6.3 Test Edge Functions
You can test functions manually via curl or Supabase dashboard:

```bash
# Test sync function (replace with your project URL and service role key)
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/sync-strava-activities \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Step 7: Create Initial Challenge

Before the app can work, you need at least one active challenge:

```sql
INSERT INTO challenges (name, starts_at, ends_at, is_active)
VALUES (
  'OUTRUN 21',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '21 days',
  true
);
```

## Step 8: Upload GPX Routes

You'll need to convert your GPX files to PostGIS LineString format and insert them:

```sql
-- Example: Insert a route for stage 1
-- Replace with your actual GPX coordinates converted to LineString
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
SELECT 
  id,
  1,
  ST_GeogFromText('LINESTRING(longitude1 latitude1, longitude2 latitude2, ...)'),
  30,
  0.8
FROM challenges 
WHERE is_active = true
LIMIT 1;

-- Repeat for stages 2 and 3
```

**Note:** Converting GPX to LineString requires:
1. Parse GPX file to extract coordinates
2. Convert to WKT (Well-Known Text) format: `LINESTRING(lon lat, lon lat, ...)`
3. Use `ST_GeogFromText()` to create geography type

## Troubleshooting

### Function Import Errors
If you see import errors for shared modules:
- Ensure you're using Supabase CLI for deployment (handles imports automatically)
- Or manually copy shared code into each function file

### PostGIS Function Not Found
If `ST_LineFromEncodedPolyline` doesn't exist:
- PostGIS may not have this function by default
- You may need to implement polyline decoding in the edge function instead
- Or use a PostGIS extension that provides this function

### Cron Jobs Not Running
- Verify `pg_cron` extension is enabled
- Check Supabase logs for cron execution errors
- Ensure service role key is correct in cron SQL

### RLS Blocking Queries
- Verify RLS policies are correctly set up
- Check that users table has proper policies
- Service role key bypasses RLS, but anon key respects it

## Next Steps

After deployment:
1. ✅ Test OAuth flow with Strava
2. ✅ Verify activities are being synced
3. ✅ Check that stage results are being created
4. ✅ Confirm leaderboards are populating
5. ✅ Test admin exclusion functionality

See `FIRST_RUN_CHECKLIST.md` for detailed testing steps.
