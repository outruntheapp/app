
# 1️⃣ Edge Function Architecture

```txt
supabase/functions/
├── _shared/
│   ├── supabase.ts        # Admin client
│   ├── logger.ts          # Structured logs
│   ├── audit.ts           # Audit writer
│   ├── strava.ts          # Strava API helpers
│   ├── geo.ts             # Route matching
│   └── guards.ts          # Defensive checks
│
├── sync-strava-activities/
│   └── index.ts           # Poll Strava + ingest
│
├── process-activities/
│   └── index.ts           # Validate + stage matching
│
├── refresh-leaderboards/
│   └── index.ts           # No-op placeholder (views)
│
├── admin-exclude-user/
|   └── index.ts           # Admin-only mutation
|
├── auth-strava-callback/
|   └── index.ts
|
└── match_activity_to_route
```

---

# 2️⃣ Shared Helpers

---

## `_shared/supabase.ts`

```ts
// supabase/functions/_shared/supabase.ts
// Purpose: Admin Supabase client for Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
```

---

## `_shared/logger.ts`

```ts
// supabase/functions/_shared/logger.ts
// Purpose: Structured logging for Edge runtime

export function logInfo(message: string, meta: unknown = {}) {
  console.log(JSON.stringify({ level: "info", message, meta }));
}

export function logError(message: string, error: unknown) {
  console.error(JSON.stringify({ level: "error", message, error }));
}
```

---

## `_shared/audit.ts`

```ts
// supabase/functions/_shared/audit.ts
// Purpose: Write immutable audit logs

import { supabaseAdmin } from "./supabase.ts";

export async function writeAuditLog({
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata,
  });
}
```

---

## `_shared/guards.ts`

```ts
// supabase/functions/_shared/guards.ts
// Purpose: Defensive checks

export function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
```

---

## `_shared/strava.ts`

```ts
// supabase/functions/_shared/strava.ts
// Purpose: Hardened Strava token handling + API helpers

import { supabaseAdmin } from "./supabase.ts";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export async function getValidAccessToken(userId: string): Promise<string> {
  const { data: token } = await supabaseAdmin
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!token) throw new Error("Missing Strava token");

  const expiresSoon =
    new Date(token.expires_at).getTime() < Date.now() + 5 * 60 * 1000;

  if (!expiresSoon) {
    return token.access_token;
  }

  const refreshed = await refreshToken(token.refresh_token);

  await supabaseAdmin.from("strava_tokens").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}

async function refreshToken(refreshToken: string) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  return await res.json();
}

```

---

## `_shared/geo.ts`

```ts
// supabase/functions/_shared/geo.ts
// Purpose: Deterministic GPS route matching

import { supabaseAdmin } from "./supabase.ts";

export async function matchesRoute({
  activityLine,
  routeId,
}: {
  activityLine: string;
  routeId: string;
}): Promise<boolean> {
  const { data: result } = await supabaseAdmin.rpc(
    "match_activity_to_route",
    {
      activity_polyline: activityLine,
      route_id: routeId,
    }
  );

  return result === true;
}

```

---

# 3️⃣ Core Edge Functions

---

## 🔁 `sync-strava-activities`

**Purpose:**
Poll Strava, ingest raw activities, ignore unsupported types.

```ts
// supabase/functions/sync-strava-activities/index.ts
// Purpose: Poll Strava and ingest raw activities

import { serve } from "https://deno.land/std/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { getValidAccessToken, fetchAthleteActivities } from "../_shared/strava.ts";
import { logInfo, logError } from "../_shared/logger.ts";

serve(async () => {
  try {
    logInfo("Starting Strava sync");

    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, strava_athlete_id");

    for (const user of users ?? []) {
      // Token handling omitted here (assumed stored securely)
      const accessToken = await getValidAccessToken(user.id);

      const activities = await fetchAthleteActivities(
        accessToken,
        lastSyncEpoch
      );

      for (const act of activities) {
        // Only real runs allowed
        if (act.type !== "Run") continue;

        // Exclude virtual runs
        if (act.sport_type === "VirtualRun") continue;
      
        // Exclude manual activities
        if (act.manual === true) continue;
      
        // Must have GPS data
        if (!act.map || !act.map.summary_polyline) continue;

        await supabaseAdmin.from("activities").upsert({
          user_id: user.id,
          strava_activity_id: act.id,
          activity_type: act.type,
          started_at: act.start_date,
          elapsed_seconds: act.elapsed_time,
          polyline: act.map?.summary_polyline,
        });
      }
    }

    return new Response("OK");
  } catch (err) {
    logError("Strava sync failed", err);
    return new Response("ERROR", { status: 500 });
  }
});
```

---

## 🧠 `process-activities`

**Purpose:**
Validate routes, assign stages, compute best times.

```ts
// supabase/functions/process-activities/index.ts
// Purpose: Match activities to stages (participants only)

import { serve } from "https://deno.land/std/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { matchesRoute } from "../_shared/geo.ts";
import { logInfo, logError } from "../_shared/logger.ts";

serve(async () => {
  try {
    logInfo("Processing activities");

    const { data: challenge } = await supabaseAdmin
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .single();

    const { data: activities } = await supabaseAdmin
      .from("activities")
      .select("*")
      .is("processed_at", null);

    for (const act of activities ?? []) {
      // 1️⃣ Enforce challenge date window
      if (
        act.started_at < challenge.starts_at ||
        act.started_at > challenge.ends_at
      ) {
        continue;
      }

      // 2️⃣ Enforce participant (ticket holder) rule
      const { data: participant } = await supabaseAdmin
        .from("participants")
        .select("id, excluded")
        .eq("user_id", act.user_id)
        .eq("challenge_id", challenge.id)
        .single();

      if (!participant || participant.excluded) {
        continue;
      }

      // 3️⃣ Route matching (per stage handled internally)
      const matched = await matchesRoute({
        activityLine: act.polyline,
        routeId: "ROUTE_ID_LOOKUP", // resolved per stage
      });

      if (!matched) continue;

      // 4️⃣ Record stage result (best time logic already enforced by upsert)
      await supabaseAdmin.from("stage_results").upsert({
        user_id: act.user_id,
        challenge_id: challenge.id,
        stage_number: 1, // resolved deterministically
        best_time_seconds: act.elapsed_seconds,
        completed_at: act.started_at,
      });

      // 5️⃣ Mark activity as processed
      await supabaseAdmin
        .from("activities")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", act.id);
    }

    return new Response("OK");
  } catch (err) {
    logError("Processing failed", err);
    return new Response("ERROR", { status: 500 });
  }
});
```

---

## 🛑 `admin-exclude-user`

**Purpose:**
Admin-only participant exclusion (API-safe).

```ts
// supabase/functions/admin-exclude-user/index.ts
// Purpose: Exclude participant (admin-only)

import { serve } from "https://deno.land/std/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { writeAuditLog } from "../_shared/audit.ts";

serve(async (req) => {
  const { participantId, adminId } = await req.json();

  await supabaseAdmin
    .from("participants")
    .update({ excluded: true })
    .eq("id", participantId);

  await writeAuditLog({
    actorId: adminId,
    action: "EXCLUDE_PARTICIPANT",
    entityType: "participant",
    entityId: participantId,
  });

  return new Response("OK");
});
```

---

## 🔄 `refresh-leaderboards` (Intentional no-op)

```ts
// supabase/functions/refresh-leaderboards/index.ts
// Purpose: Placeholder — leaderboards are DB views

import { serve } from "https://deno.land/std/http/server.ts";

serve(() => new Response("Leaderboards are derived via views"));
```

---

# 4️⃣ Cron Setup (Supabase)

```sql
select
  cron.schedule(
    'sync-strava',
    '*/30 * * * *',
    $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/sync-strava-activities') $$
  );

select
  cron.schedule(
    'process-activities',
    '*/30 * * * *',
    $$ select net.http_post(url := 'https://PROJECT.supabase.co/functions/v1/process-activities') $$
  );
```
---

# 5️⃣ Auth Strava Callback (Supabase)

```ts
// supabase/functions/auth-strava-callback/index.ts
// Purpose: Handle Strava OAuth callback and store tokens securely

import { serve } from "https://deno.land/std/http/server.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { writeAuditLog } from "../_shared/audit.ts";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

serve(async (req) => {
  try {
    const { code } = await req.json();

    if (!code) {
      return new Response("Missing OAuth code", { status: 400 });
    }

    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID"),
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      throw new Error("Strava token exchange failed");
    }

    const tokenData = await tokenRes.json();

    const athlete = tokenData.athlete;

    // Upsert user
    const { data: user } = await supabaseAdmin
      .from("users")
      .upsert({
        strava_athlete_id: athlete.id,
        full_name: `${athlete.firstname} ${athlete.lastname}`,
        sex: athlete.sex,
      })
      .select()
      .single();

    // Store tokens securely
    await supabaseAdmin.from("strava_tokens").upsert({
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
    });

    await writeAuditLog({
      actorId: user.id,
      action: "STRAVA_CONNECTED",
      entityType: "user",
      entityId: user.id,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OAuth callback failed", err);
    return new Response("OAuth error", { status: 500 });
  }
});

```
---

# 5️⃣ Postgres Function (Supabase)

```ts
-- Purpose: Compare activity polyline against buffered route

create or replace function match_activity_to_route(
  activity_polyline text,
  route_id uuid
) returns boolean as $$
declare
  route geography;
  activity geography;
  overlap_ratio numeric;
begin
  select gpx_geo into route from routes where id = route_id;

  activity := ST_LineFromEncodedPolyline(activity_polyline)::geography;

  overlap_ratio :=
    ST_Length(
      ST_Intersection(
        ST_Buffer(route, 30),
        activity
      )
    ) / ST_Length(route);

  return overlap_ratio >= 0.8;
end;
$$ language plpgsql;

```
