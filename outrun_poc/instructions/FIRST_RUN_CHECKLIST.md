# 1️⃣ FIRST SUCCESSFUL RUN — END-TO-END CHECKLIST

This is the **exact sequence** that proves the system works for real.

You should be able to tick these off **in order** and stop as soon as something fails.

---

## ✅ PHASE A — Infrastructure sanity

### A1. Supabase project exists ☑️

Confirm in Supabase dashboard:

* Project created
* Region selected
* You have:

  * Project URL
  * Anon key
  * Service role key

---

### A2. Database schema applied

In Supabase SQL editor:

Confirm tables exist:

* `users`
* `participants`
* `activities`
* `stage_results`
* `strava_tokens`
* `audit_logs`
* `routes`
* `challenges`

Confirm views exist:

* `leaderboard_overall`
* `leaderboard_stage`

Confirm RPC functions exist:

* `check_strava_connection_by_email` (from migration `04_check_strava_by_email.sql`)

**⚠️ CRITICAL**: If you see a 406 error when checking email, the RPC function `check_strava_connection_by_email` is missing. Apply the migration:
1. Open Supabase SQL Editor
2. Run the SQL from `supabase/migrations/04_check_strava_by_email.sql`
3. Verify the function exists: `SELECT proname FROM pg_proc WHERE proname = 'check_strava_connection_by_email';`

✅ If any are missing → stop here

---

### A3. One active challenge exists

Insert **one** challenge:

```sql
insert into challenges (name, starts_at, ends_at, is_active)
values (
  'OUTRUN 21',
  now() - interval '1 day',
  now() + interval '21 days',
  true
);
```

Confirm:

```sql
select * from challenges where is_active = true;
```

Must return **exactly one row**.

---

## ✅ PHASE B — Edge Functions & env wiring

### B1. Edge Functions deployed

From CLI or dashboard, confirm these exist:

* `auth-strava-callback`
* `sync-strava-activities`
* `process-activities`
* `admin-exclude-user`

If not:

```bash
supabase functions deploy <name>
```

---

### B2. Edge Function environment variables set

In Supabase → Functions → Environment Variables:

Must exist:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
APP_BASE_URL
```

❌ If even one is missing → OAuth or sync will fail silently

---

## ✅ PHASE C — Frontend wiring

### C1. Vercel env variables set ☑️

In Vercel → Project → Environment Variables:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

Redeploy after setting.

---

### C2. `/auth/callback` resolves

Visit manually:

```
https://your-app-domain.com/auth/callback
```

Expected:

* Blank page
* No 404
* No crash

If 404 → file path is wrong

---

## ✅ PHASE D — Strava OAuth test

### D1. Strava App settings

In Strava developer dashboard:

Authorization Callback Domain:

```
https://your-app-domain.com/auth/callback
```

Scopes:

```
read,activity:read
```

**Password reset (email/password auth):** In Supabase Dashboard → Authentication → URL Configuration, set **Redirect URLs** to include your app’s callback (e.g. `https://your-app-domain.com/auth/callback` and `http://localhost:3000/auth/callback` for local dev) so “Forgot password” recovery links work.

---

### D2. First OAuth connection

On your app:

* Click **Connect with Strava**
* Approve access
* Redirect back to `/auth/callback`
* Redirect to `/dashboard`

Now check Supabase:

#### `users`

```sql
select * from users;
```

✔ row exists

#### `strava_tokens`

```sql
select * from strava_tokens;
```

✔ tokens stored
✔ expires_at populated

#### `audit_logs`

```sql
select * from audit_logs;
```

✔ `STRAVA_CONNECTED` entry exists

---

## ✅ PHASE E — Activity ingestion

### E1. Manual Strava activity

* Record a **Run**
* Make sure it’s public / visible to apps
* Wait 30–60 minutes **or** trigger manually:

```bash
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/sync-strava-activities
```

Check:

```sql
select * from activities;
```

✔ activity inserted
✔ `processed_at` is NULL

---

## ✅ PHASE F — Processing & results

### F1. Add a test route (temporary)

Insert a dummy route to unblock testing:

```sql
insert into routes (challenge_id, stage_number, gpx_geo)
select id, 1, ST_GeogFromText('LINESTRING(0 0, 0.01 0.01)')
from challenges where is_active = true;
```

---

### F2. Process activities

Trigger:

```bash
curl -X POST https://PROJECT_ID.supabase.co/functions/v1/process-activities
```

Check:

#### `stage_results`

```sql
select * from stage_results;
```

✔ row exists

#### `activities`

```sql
select processed_at from activities;
```

✔ processed_at populated

---

## ✅ PHASE G — Leaderboards

```sql
select * from leaderboard_overall;
select * from leaderboard_stage;
```

✔ data visible
✔ excluded users disappear automatically

---

### 🎉 FIRST SUCCESSFUL RUN = COMPLETE

At this point:

* OAuth works
* Tokens refresh
* Activities ingest
* Stages compute
* Leaderboards derive
* Audit logs record

**This is the MVP “proof moment”.**
