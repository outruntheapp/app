# How GPX Files Reach the Routes Page

This document traces how the GPX files in **public/routes/challenge_1** are loaded and displayed on the Routes page (`./pages/routes.js`). The app fetches them via HTTP and syncs the DB from GPX; migration 02 is legacy stub.

---

## 1. Source: GPX files in public

**Location (relative to project root):**

```
outrun_poc/public/routes/challenge_1/
├── stage-1.gpx
├── stage-2.gpx
└── stage-3.gpx
```

Next.js serves these as static assets at `/routes/challenge_1/stage-N.gpx`. The API route and demo-polylines route **fetch** them via HTTP (same origin); no filesystem read.

---

## 2. API route fetches GPX via HTTP, syncs DB, returns GeoJSON

**File:** `outrun_poc/src/pages/api/routes.js`

- **When it runs:** When the Routes page uses the **fallback** path (see step 3): routeService tries Supabase first; if the `routes` table has no rows for the active challenge, it calls this API.
- **How GPX is loaded:** Fetches from the same origin via HTTP:

```javascript
const baseUrl = getBaseUrl(req);  // NEXT_PUBLIC_APP_URL or VERCEL_URL or req.headers.host
const response = await fetch(`${baseUrl}/routes/challenge_1/stage-${stage}.gpx`);
const gpxText = await response.text();
```

- **Parsing:** `parseGpxTrkpt(gpxText)` returns `[{ lat, lon }, ...]`. The handler also builds WKT and calls the RPC **sync_challenge_routes_from_wkt** (migration 07) to write route geometry into the DB so process-activities can match activities to routes.
- **Response shape:** Array of route objects with `gpx_geo: { type: "LineString", coordinates: [[lon, lat], ...] }` (same as before).
- **DB sync:** If Supabase service role env and active challenge exist, the API calls the RPC with WKT for each stage so the `routes` table is populated from the GPX files. Subsequent requests can then be served from the DB.

---

## 3. Route service: Supabase first, then API fallback

**File:** `outrun_poc/src/services/routeService.js`

**Import used by the Routes page:**

```javascript
import { fetchActiveChallengeRoutes } from "../services/routeService";
```

**Function:** `fetchActiveChallengeRoutes()`

1. **Active challenge:** Calls `fetchActiveChallenge()` from `./challengeService.js` (Supabase `challenges` where `is_active = true`). If none, returns `[]`.
2. **Supabase routes:** Queries `routes` for that challenge:
   ```javascript
   const { data, error } = await supabase
     .from("routes")
     .select("id, challenge_id, stage_number, buffer_meters, min_overlap_ratio, gpx_geo")
     .eq("challenge_id", challenge.id)
     .order("stage_number", { ascending: true });
   ```
3. **If any rows exist:** Returns `data` (from DB). Those rows may have `gpx_geo` as PostGIS geography (often served as WKT string or similar by Supabase).
4. **If no rows (fallback):** Fetches the API that reads the GPX files:
   ```javascript
   const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
   const res = await fetch(`${baseUrl}/api/routes`);
   const fromApi = await res.json();
   return Array.isArray(fromApi) ? fromApi : [];
   ```
   So when the DB has no routes, the client calls `GET /api/routes`, which fetches `public/routes/challenge_1/stage-*.gpx` via HTTP, syncs the DB via the RPC, and returns the GeoJSON array.

---

## 4. Routes page: loads data and passes one route to the map

**File:** `outrun_poc/src/pages/routes.js`

**Imports:**

```javascript
import { fetchActiveChallengeRoutes } from "../services/routeService";
import { fetchActiveChallenge } from "../services/challengeService";
import RouteMap from "../components/routes/RouteMap";
```

**Flow:**

1. **On mount:** `useEffect` runs `loadData()`.
2. **loadData:**  
   - `routesData = await fetchActiveChallengeRoutes()` → either DB routes or API (GPX-based) routes as above.  
   - `challengeData = await fetchActiveChallenge()`.  
   - `setRoutes(routesData || [])`, `setChallenge(challengeData)`.
3. **Render:** Builds `routesByStage` from `routes`, and `selectedRoute = routesByStage[selectedStage]` (tabs for stage 1/2/3).
4. **Map:** Renders:
   ```javascript
   <RouteMap route={selectedRoute} stageNumber={selectedStage} />
   ```
   So the **route object** (whether from DB or from the API/GPX fallback) is passed as the `route` prop to `RouteMap`. That object includes `gpx_geo` (GeoJSON from API, or DB geography from Supabase).

---

## 5. RouteMap: turns `gpx_geo` into a visible map

**File:** `outrun_poc/src/components/routes/RouteMap.js`

**Import (used by Routes page):** Already shown above — `import RouteMap from "../components/routes/RouteMap"` in `routes.js`.

**Props:** `route`, `stageNumber`.

**How it uses `route.gpx_geo`:**

- **From API (GPX path):** `gpx_geo` is a GeoJSON object: `{ type: "LineString", coordinates: [[lon, lat], ...] }`.  
  RouteMap checks `gpxGeo.type === "LineString" && Array.isArray(gpxGeo.coordinates)` and then:
  - Converts to `{ lat, lon }` for center/path.
  - Builds `pathString` as `lat,lon|lat,lon|...` for embed URLs.
  - If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set: shows an iframe with Google Maps embed URL.
  - Otherwise: shows “View Route on Google Maps” link and waypoint count.
- **From DB:** If `gpx_geo` is a string (e.g. WKT like `LINESTRING(...)`), RouteMap uses `lineStringToGoogleMapsEmbed(gpxGeo)` to parse it and build the same map/link output.

So the **same RouteMap component** displays data whether it came from the DB or from the GPX-based API; the only difference is the shape of `route.gpx_geo` (object vs string).

---

## End-to-end summary (GPX → UI)

| Step | File | What happens |
|------|------|--------------|
| 1 | `public/routes/challenge_1/stage-1.gpx` (and 2, 3) | GPX files served as static assets at `/routes/challenge_1/stage-N.gpx`. |
| 2 | `src/pages/api/routes.js` | Runs when client calls `GET /api/routes`. Fetches GPX via HTTP, parses, builds WKT, calls RPC `sync_challenge_routes_from_wkt` to sync DB, returns JSON with `gpx_geo: { type: "LineString", coordinates }`. |
| 3 | `src/services/routeService.js` | `fetchActiveChallengeRoutes()`: gets active challenge, then either returns Supabase `routes` rows or, if empty, `fetch("/api/routes")` and returns that JSON. No direct import of GPX or API file. |
| 4 | `src/pages/routes.js` | Imports `fetchActiveChallengeRoutes` from `routeService`, calls it in `loadData()`, stores result in `routes` state, selects one route by stage and passes it to `<RouteMap route={selectedRoute} stageNumber={selectedStage} />`. |
| 5 | `src/components/routes/RouteMap.js` | Receives `route` (with `gpx_geo`). If GeoJSON LineString (API/GPX path), uses coordinates to build map embed or “View on Google Maps” link. If string (DB WKT), uses `lineStringToGoogleMapsEmbed`. Renders iframe or fallback UI. |

**Important:** GPX in **public** is the source of truth. When the DB has no routes for the active challenge, `GET /api/routes` is called, fetches the GPX via HTTP, syncs the `routes` table via the RPC (migration 07), and returns GeoJSON. Subsequent loads use the DB. Migration 02 is legacy stub.
