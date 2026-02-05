# Quick Deployment Checklist

## ✅ Step 1: Push to GitHub (COMPLETED)
- ✅ All code pushed to: https://github.com/outruntheapp/app.git
- ✅ Branch: `main`

## 📋 Step 2: Deploy to Supabase

### 2.1 Database Schema ☑️
**Option A: Use consolidated file (Easiest)**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/01_initial_schema.sql`
3. Copy entire file and paste into SQL Editor
4. Click **Run**

**Option B: Use step-by-step from SQL_SCHEMA.md**
- Follow instructions in `SQL_SCHEMA.md` section by section

### 2.2 Postgres Function
1. Go to SQL Editor
2. Open `supabase/migrations/match_activity_to_route.sql`
3. Copy and paste, then **Run**

### 2.3 Edge Functions ☑️

**If you have Supabase CLI:**
```bash
# Install if needed
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
cd outrun_poc
supabase functions deploy auth-strava-callback
supabase functions deploy sync-strava-activities
supabase functions deploy process-activities
supabase functions deploy admin-exclude-user
supabase functions deploy refresh-leaderboards
```

**If using Supabase Dashboard:**
- See detailed instructions in `SUPABASE_DEPLOYMENT.md` Step 3

### 2.4 Environment Variables ☑️
Go to **Project Settings** → **Edge Functions** → **Secrets** and add:
```
DB_URL=https://YOUR_PROJECT.supabase.co
SERVICE_ROLE_KEY=your-service-role-key
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
APP_BASE_URL=https://your-app-domain.com
```

### 2.5 Cron Jobs (scheduled jobs) ☑️
1. Ensure migration **14_enable_pg_net.sql** has been applied (enables `pg_net` so cron can call Edge Functions).
2. Open **`outrun_poc/supabase/sql/cron_schedule.sql`** in the repo.
3. Replace **PROJECT_REF** and **SERVICE_ROLE_KEY** with your values (use existing Supabase env: **SUPABASE_URL** → project ref, **SERVICE_ROLE_KEY** or **SUPABASE_SERVICE_ROLE_KEY** from Project Settings → API).
4. Copy the entire file into Supabase SQL Editor and **Run**.

Default schedule: **hourly** (sync at :00, process at :15). To run **once per day**, change the cron expressions in the file as noted in the comments before running.

### 2.6 Initial Data ☑️
Create a challenge:
```sql
INSERT INTO challenges (name, starts_at, ends_at, is_active)
VALUES (
  'OUTRUN 21',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '21 days',
  true
);
```

## 📚 Full Documentation
- **Detailed deployment guide**: `SUPABASE_DEPLOYMENT.md`
- **SQL schema reference**: `SQL_SCHEMA.md`
- **Edge functions reference**: `EDGE_FUNCTIONS.md`
- **App flow diagram**: `APP_FLOW_DIAGRAM.md` (application flow and roadmap)
- **Testing checklist**: `FIRST_RUN_CHECKLIST.md`

## 🚀 Next Steps After Deployment
1. Test OAuth flow with Strava
2. Verify activities sync
3. Upload GPX routes for stages
4. Test leaderboard functionality
5. Deploy frontend to Vercel
