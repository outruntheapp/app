# Deployment Checklist (Supabase + Vercel)

This is the **exact order** you should follow.

---

## 🧱 PHASE 1 — Supabase Setup

### 1. Create Supabase Project ☑️

* Choose region close to users
* Save:

  * Project URL: DB_URL
  * Anon key: ANON_KEY
  * Service role key: SERVICE_ROLE_KEY
  * Domain URL: APP_BASE_URL

---

### 2. Enable Required Extensions

In SQL editor:

```sql
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;
```

---

### 3. Apply Database Schema

Run **in order**:

1. Core tables
2. Audit logs
3. Token tables
4. Routes
5. Views
6. RLS policies
7. Triggers

✔️ No data needed yet

---

### 4. Configure Edge Function Secrets

In Supabase Dashboard → Functions → Environment Variables:

```txt
DB_URL
SERVICE_ROLE_KEY
STRAVA_CLIENT_ID (need to still add)
STRAVA_CLIENT_SECRET (need to still add)
APP_BASE_URL
```
* under Authentication/URL Configuration/Redirct URLs: http://outrun.co.za
---

### 5. Deploy Edge Functions

```bash
supabase functions deploy auth-strava-callback
supabase functions deploy sync-strava-activities
supabase functions deploy process-activities
supabase functions deploy admin-exclude-user
```

---

### 6. Schedule Cron Jobs

Run SQL:

```sql
select cron.schedule(
  'sync-strava',
  '*/30 * * * *',
  $$ select net.http_post(
    url := 'https://PROJECT_ID.supabase.co/functions/v1/sync-strava-activities'
  ) $$
);
```

(Repeat for `process-activities`)

---

## 🌐 PHASE 2 — Strava Developer App

### 7. Create Strava App

* Category: Virtual Event / Fitness
* Authorization Callback Domain:

```
https://outrun.app/auth/callback
```

* Scopes:

```
read,activity:read
```

---

### 8. Wait for Strava Approval

⚠️ This can take days.

Nothing else will work without this.

---

## 🚀 PHASE 3 — Vercel Deployment

### 9. Create Vercel Project ☑️

* Import Git repo
* Framework: Next.js

---

### 10. Add Environment Variables (Vercel) ☑️

```env
NEXT_PUBLIC_SUPABASE_URL=https://ndfgymfsszgqjauhyycv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...[fill in]
NEXT_PUBLIC_APP_URL=https://outrun.app
```

---

### 11. Set Redirect URLs

Make sure:

```
NEXT_PUBLIC_APP_URL/auth/callback
```

matches **Strava exactly**

---

### 12. Deploy

```bash
git push main
```

---

## ✅ Final Validation Checklist

After deployment, confirm:

* [ ] `/` loads
* [ ] Strava connect redirects correctly
* [ ] User appears in `users` table
* [ ] Tokens stored in `strava_tokens`
* [ ] Activities ingested via cron
* [ ] `processed_at` populated
* [ ] Stage results created
* [ ] Leaderboard views populated
* [ ] Admin exclusion works
* [ ] Audit logs written

---

# 🟢 Bottom Line

You do **not** need to invent paths or register many things.

You only need to:

* Create the callback page
* Register **one URL** with Strava
* Deploy Edge Functions
* Set env vars correctly

Everything else is internal wiring.
