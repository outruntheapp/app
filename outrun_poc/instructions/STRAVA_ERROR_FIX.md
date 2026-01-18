# Strava API Error Fix

## Error Description
The error you're seeing:
```
[Error] Preflight response is not successful. Status code: 500
[Error] Fetch API cannot load https://ndfgymfsszgqjauhyycv.supabase.co/functions/v1/auth-strava-callback due to access control checks.
```

## Root Cause
This error is **NOT** due to Strava API approval status. It's a **CORS (Cross-Origin Resource Sharing) issue** with the Supabase Edge Function.

When your browser makes a request to the edge function, it first sends a "preflight" OPTIONS request to check if the server allows cross-origin requests. The edge function was returning a 500 error for OPTIONS requests because it didn't handle them properly.

## Fix Applied
I've added CORS headers to the `auth-strava-callback` edge function:

1. **CORS headers** are now included in all responses
2. **OPTIONS preflight requests** are now handled correctly
3. Both the regular and standalone versions have been updated

## Files Updated
- `supabase/functions/auth-strava-callback/index.ts`
- `supabase/functions/standalone/auth-strava-callback.ts`

## Next Steps
1. **Redeploy the edge function** to Supabase:
   ```bash
   supabase functions deploy auth-strava-callback
   ```
   
   Or if using the Dashboard, copy the updated standalone version from:
   `supabase/functions/standalone/auth-strava-callback.ts`

2. **Test the connection** - the CORS error should be resolved

## Note on Strava API Approval
While the CORS error is fixed, you still need:
- Strava API approval for production use
- Valid Strava Client ID and Secret configured
- Correct callback URL in Strava app settings

However, you can now use **Demo Mode** (see `DEMO_MODE.md`) to test the app without Strava API approval.
