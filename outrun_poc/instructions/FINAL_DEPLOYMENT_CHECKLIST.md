# Final Deployment Checklist

## ✅ Completed
- [x] Supabase database schema applied
- [x] Edge functions deployed
- [x] Cron jobs configured
- [x] Supabase environment variables set

## 🔴 Remaining Tasks

### 1. Vercel Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these **4 required variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=https://outrun.app
NEXT_PUBLIC_STRAVA_CLIENT_ID=your-strava-client-id
```

**Important Notes:**
- All variables must start with `NEXT_PUBLIC_` to be accessible in the browser
- `NEXT_PUBLIC_STRAVA_CLIENT_ID` is safe to expose (it's public in the OAuth flow)
- After adding variables, **redeploy** your Vercel project

**How to add in Vercel:**
1. Go to your project in Vercel
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter variable name (e.g., `NEXT_PUBLIC_STRAVA_CLIENT_ID`)
5. Enter variable value
6. Select environment (Production, Preview, Development - or all)
7. Click **Save**
8. Repeat for all 4 variables
9. Go to **Deployments** tab and click **Redeploy** (or push a new commit)

### 2. Strava App Configuration

Go to **Strava Developer Dashboard**: https://www.strava.com/settings/api

**Authorization Callback Domain:**
```
https://outrunapp.vercel.app/auth/callback

LATER
https://outrun.co.za/auth/callback
```

**Important:**
- Must match **exactly** what you set in `NEXT_PUBLIC_APP_URL/auth/callback`
- No trailing slash
- Must be `https://` (not `http://`)
- If your domain is different, use that instead

**Scopes Required:**
```
read,activity:read
```

### 3. Verify Callback URL Match

The callback URL must match in **3 places**:

1. **Vercel**: `NEXT_PUBLIC_APP_URL` = `https://outrunapp.vercel.app` LATER `https://outrun.co.za`
2. **Strava**: Authorization Callback Domain = `https://outrunapp.vercel.app/auth/callback` LATER `https://outrun.co.za/auth/callback`
3. **Code**: `authService.js` constructs: `${NEXT_PUBLIC_APP_URL}/auth/callback`

All three must resolve to the same URL!

## 🟡 Optional but Recommended

### 4. Create Initial Challenge (if not done)

Run in Supabase SQL Editor:
```sql
INSERT INTO challenges (name, starts_at, ends_at, is_active)
VALUES (
  'OUTRUN 21',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '21 days',
  true
);
```

### 5. Upload GPX Routes (Required for Testing)

You'll need to convert GPX files to PostGIS LineString format. See `SUPABASE_DEPLOYMENT.md` Step 8 for details.

## ✅ After Deployment - Test Checklist

Once everything is configured:

1. **Visit your app**: `https://outrunapp.vercel.app`
   - Should load without errors
   - Should show "Connect with Strava" button

2. **Test OAuth Flow**:
   - Click "Connect with Strava"
   - Should redirect to Strava
   - After approval, should redirect back to `/auth/callback`
   - Should then redirect to `/dashboard`

3. **Verify in Supabase**:
   ```sql
   -- Check user was created
   SELECT * FROM users;
   
   -- Check tokens stored
   SELECT * FROM strava_tokens;
   
   -- Check audit log
   SELECT * FROM audit_logs WHERE action = 'STRAVA_CONNECTED';
   ```

4. **Test Activity Sync** (after 30 minutes or manually trigger):
   ```sql
   -- Check activities ingested
   SELECT * FROM activities;
   ```

## 🚨 Common Issues

### "Strava client ID not configured"
- Make sure `NEXT_PUBLIC_STRAVA_CLIENT_ID` is set in Vercel
- Make sure you **redeployed** after adding the variable

### "OAuth callback failed"
- Check that callback URL in Strava matches exactly
- Check that `NEXT_PUBLIC_APP_URL` is correct
- Check Vercel deployment logs for errors

### "Invalid redirect_uri"
- Strava callback domain must match exactly
- No trailing slashes
- Must be `https://`

### Functions not working
- Check Supabase Edge Function logs
- Verify environment variables in Supabase Dashboard → Functions → Secrets
- Check that cron jobs are running (check Supabase logs)

## 📝 Summary

**To complete deployment, you need:**

1. ✅ Add 4 environment variables to Vercel
2. ✅ Configure Strava callback URL
3. ✅ Redeploy Vercel project
4. ⚠️ Wait for Strava app approval (if not already approved)
5. ⚠️ Upload GPX routes (for testing route matching)

Once these are done, the app should be fully functional!
