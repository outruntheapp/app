# Vercel Environment Variables Setup Guide

## Quick Steps

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Environment Variables**

2. **Add Each Variable**

   Click **Add New** for each of these:

   | Variable Name | Example Value | Notes |
   |--------------|---------------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Found in Supabase Settings → API |
   | `NEXT_PUBLIC_APP_URL` | `https://outrunapp.vercel.app` | Your Vercel deployment URL |
   | `NEXT_PUBLIC_STRAVA_CLIENT_ID` | `12345` | From Strava Developer Dashboard |

3. **Select Environments**
   - Choose **Production**, **Preview**, and **Development** (or just Production if you prefer)

4. **Save and Redeploy**
   - After adding all variables, go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment → **Redeploy**
   - Or push a new commit to trigger redeploy

## Troubleshooting "Having Trouble Adding Strava Key"

### Issue: Variable not showing up in code

**Solution:**
- Make sure variable name starts with `NEXT_PUBLIC_`
- Variables without this prefix are server-side only
- After adding, you **must redeploy** for changes to take effect

### Issue: Can't find where to add variables

**Solution:**
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click **Settings** (gear icon in top nav)
4. Click **Environment Variables** in left sidebar
5. Click **Add New** button

### Issue: Variable added but still getting error

**Solution:**
1. Check spelling: `NEXT_PUBLIC_STRAVA_CLIENT_ID` (not `STRAVA_CLIENT_ID`)
2. Check you selected the right environment (Production/Preview)
3. **Redeploy** - environment variables only apply to new deployments
4. Check Vercel build logs for any errors

### Issue: Getting "Strava client ID not configured" error

**Check:**
1. Variable is named exactly: `NEXT_PUBLIC_STRAVA_CLIENT_ID`
2. Value is your actual Strava Client ID (number, not secret)
3. You've redeployed after adding the variable
4. Check browser console for the actual error message

## Verification

After adding variables and redeploying:

1. Visit your deployed app
2. Open browser DevTools (F12) → Console
3. Check for any environment variable errors
4. Try clicking "Connect with Strava" - should redirect to Strava

## Where to Find Values

### NEXT_PUBLIC_SUPABASE_URL
- Supabase Dashboard → Settings → API → Project URL

### NEXT_PUBLIC_SUPABASE_ANON_KEY
- Supabase Dashboard → Settings → API → anon/public key

### NEXT_PUBLIC_APP_URL
- Your Vercel deployment URL (e.g., `https://your-project.vercel.app` or custom domain)

### NEXT_PUBLIC_STRAVA_CLIENT_ID
- Strava Developer Dashboard → Your App → Client ID (the number, not the secret)
