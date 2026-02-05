# Standalone Edge Functions for Supabase Dashboard

These files are **standalone versions** of the edge functions with all shared code inlined. Use these when deploying via **Supabase Dashboard** instead of the CLI.

## Why Standalone Versions?

When deploying via Supabase Dashboard (web UI), the `_shared/` directory structure is not automatically recognized. The imports like `from "../_shared/supabase.ts"` will fail.

These standalone files include all shared code inline, making them ready to copy-paste directly into the Supabase Dashboard.

## How to Deploy

### Via Supabase Dashboard:

1. Go to your Supabase project → **Edge Functions**
2. Click **Create Function**
3. Name the function (e.g., `auth-strava-callback`)
4. Copy the **entire contents** of the corresponding `.ts` file from this directory
5. Paste into the code editor
6. Click **Deploy**

### Files Available:

- `auth-strava-callback.ts` → Function name: `auth-strava-callback`
- `sync-strava-activities.ts` → Function name: `sync-strava-activities`
- `process-activities.ts` → Function name: `process-activities`
- `admin-exclude-user.ts` → Function name: `admin-exclude-user`
- `refresh-leaderboards.ts` → Function name: `refresh-leaderboards`

## Alternative: Use Supabase CLI

If you prefer, you can use the Supabase CLI which automatically handles the `_shared/` directory:

```bash
supabase functions deploy auth-strava-callback
supabase functions deploy sync-strava-activities
# etc...
```

The CLI version uses the files in `../auth-strava-callback/index.ts` etc., which import from `_shared/`.

## Environment Variables

Make sure to set these in **Project Settings** → **Edge Functions** → **Secrets**:

- `DB_URL`
- `SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `APP_BASE_URL`
