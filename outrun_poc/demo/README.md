# Demo data (MVP)

Demo mode lets you test the app without Strava. See **instructions/DEMO_MODE.md** for how to enable and use it.

**Files**

- `demoData.js` — Demo user ID, stage times, fallback polylines.
- `demoService.js` — Calls init-demo-data Edge Function; fetches route polylines from API when available.
- `generate-demo-polylines.js` — Builds `demoPolylines.json` from route GPX (run: `npm run generate-demo-polylines`).
