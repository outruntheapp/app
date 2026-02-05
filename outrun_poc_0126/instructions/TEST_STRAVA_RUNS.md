# Testing with Real Strava Run Data

This guide describes a **temporary** way to test the app’s matching pipeline using a user’s real run data from Strava: insert activities into the DB, then run process-activities so `match_activity_to_route` can create stage results. No app logic changes are required.

## 1. Getting run data from Strava

You need at least:

- **polyline** – Google-encoded polyline string (Strava’s `map.summary_polyline` from the [Strava API Activity object](https://developers.strava.com/docs/reference/#api-models-SummaryActivity)).
- **started_at** – ISO 8601 datetime of the activity start.
- **elapsed_seconds** – Duration in seconds.
- **user_id** – Supabase auth user UUID (the user who “owns” this activity in your app).

Optionally:

- **strava_activity_id** – Strava’s activity ID (recommended for deduplication).
- **activity_type** – e.g. `"Run"`.

**Ways to get the data:**

- **Strava API:** Call `GET /athlete/activities` or `GET /activities/{id}` and read `map.summary_polyline`, `start_date`, `elapsed_time`. Use the same encoded polyline format; no conversion needed.
- **Export / manual:** If you have a GPX or a list of coordinates, you can encode to Google polyline (e.g. using `npm run generate-demo-polylines` logic or `@googlemaps/polyline-codec`) and set `started_at` / `elapsed_seconds` manually.

## 2. Inserting into `activities`

Insert one or more rows into `activities` with:

- `user_id` – Supabase user UUID.
- `strava_activity_id` – optional but recommended (unique).
- `activity_type` – e.g. `"Run"`.
- `started_at` – timestamptz.
- `elapsed_seconds` – integer.
- `polyline` – Google encoded polyline text.
- Leave **`processed_at`** as **NULL** so process-activities will pick the activity up.

You can do this via:

- **Supabase Dashboard** – Table Editor → `activities` → Insert row.
- **Script** – e.g. `node scripts/ingest-strava-activity.js` (see below) to read a JSON file and insert via the Supabase client (service role).

## 3. Running the matcher (process-activities)

After inserting activities:

- **Supabase:** Invoke the Edge Function `process-activities` (e.g. from Dashboard → Edge Functions → process-activities → Invoke), or run the **cron** that calls it if configured.
- The function loads unprocessed activities, checks challenge window and participant, and for each activity calls `match_activity_to_route(activity_polyline, route_id)`. On match (overlap ≥ 0.8 with buffered route), it upserts `stage_results` and sets `activities.processed_at`.

So “testing” = insert → invoke process-activities → check `stage_results` (and `activities.processed_at`).

## 4. Caveats

- **Challenge window:** `started_at` must fall within the active challenge’s `starts_at` and `ends_at`.
- **Participant:** The `user_id` must have a row in `participants` for the active challenge.
- **Routes in DB:** Route geometry must be in the DB and match the GPX files used for display (run `scripts/upload-routes.js` and apply the generated SQL so `routes.gpx_geo` is set).
- **Polyline format:** Must be **Google encoded polyline**. Strava’s `map.summary_polyline` is already in this format. If you build from GPX, use the same encoding as in `demo/generate-demo-polylines.js` or the `/api/demo-polylines` route.

For quick local tests you can also use the **demo polylines** (from route GPX) as a stand-in for “real” run geometry: run `npm run generate-demo-polylines`, then use the strings in `demo/demoPolylines.json` when inserting an activity so it matches a route.

## 5. Optional: ingest script

A small Node script can insert activities from a JSON file so you don’t have to paste into the Dashboard.

- **Script:** `scripts/ingest-strava-activity.js`
- **Usage:** `node scripts/ingest-strava-activity.js path/to/activity.json`
- **Env:** `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`).

**activity.json** shape (minimum):

```json
{
  "user_id": "uuid-of-supabase-auth-user",
  "polyline": "encoded_polyline_string",
  "started_at": "2025-01-15T08:00:00Z",
  "elapsed_seconds": 3600
}
```

Optional fields: `strava_activity_id`, `activity_type` (default `"Run"`).

After ingest, run process-activities (Dashboard or cron) to perform matching.
