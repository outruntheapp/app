-- =============================================================================
-- Test / inspect similarity between activity polyline and route polyline
-- Run in Supabase SQL Editor. Uses match_activity_to_route_debug (migration 13).
-- Polylines are Google encoded, precision 5 (Strava map.summary_polyline).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Routes: polyline presence and point count
-- -----------------------------------------------------------------------------
select
  r.id as route_id,
  r.challenge_id,
  r.stage_number,
  r.buffer_meters,
  r.min_overlap_ratio,
  case when r.polyline is not null and trim(r.polyline) != '' then 'yes' else 'no' end as has_polyline,
  case
    when r.polyline is not null and trim(r.polyline) != ''
    then ST_NPoints(ST_LineFromEncodedPolyline(r.polyline, 5)::geometry)
    else null
  end as route_point_count,
  round(ST_Length(r.gpx_geo::geography) / 1000.0, 2) as gpx_length_km
from routes r
order by r.challenge_id, r.stage_number;


-- -----------------------------------------------------------------------------
-- 2. Activities: polyline presence and point count (recent only)
-- -----------------------------------------------------------------------------
select
  a.id as activity_id,
  a.user_id,
  a.strava_activity_id,
  a.activity_type,
  a.started_at,
  case when a.polyline is not null and trim(a.polyline) != '' then 'yes' else 'no' end as has_polyline,
  case
    when a.polyline is not null and trim(a.polyline) != ''
    then ST_NPoints(ST_LineFromEncodedPolyline(a.polyline, 5)::geometry)
    else null
  end as activity_point_count,
  length(a.polyline) as polyline_char_length
from activities a
where a.polyline is not null and trim(a.polyline) != ''
order by a.started_at desc nulls last
limit 50;


-- -----------------------------------------------------------------------------
-- 3. Single comparison: one activity vs one route (debug RPC)
-- Replace the two UUIDs with a real activity id and route id from your DB.
-- -----------------------------------------------------------------------------
select match_activity_to_route_debug(
  (select polyline from activities where id = 'ACTIVITY_UUID_HERE' limit 1),
  'ROUTE_UUID_HERE'::uuid
) as result;
-- Result fields: activity_point_count, route_polyline_used, route_point_count, overlap_ratio, matched


-- -----------------------------------------------------------------------------
-- 4. Compare one activity against all routes of the active challenge
-- Replace ACTIVITY_UUID_HERE with a real activity id.
-- -----------------------------------------------------------------------------
select
  r.id as route_id,
  r.stage_number,
  r.buffer_meters,
  r.min_overlap_ratio,
  match_activity_to_route_debug(
    (select polyline from activities where id = 'ACTIVITY_UUID_HERE' limit 1),
    r.id
  ) as similarity
from routes r
join challenges c on c.id = r.challenge_id and c.is_active = true
order by r.stage_number;


-- -----------------------------------------------------------------------------
-- 5. Similarity matrix: each activity (with polyline) vs each route of active challenge
-- Heavy if you have many activities; reduce limit or add date filter.
-- -----------------------------------------------------------------------------
select
  a.id as activity_id,
  a.started_at,
  r.id as route_id,
  r.stage_number,
  (match_activity_to_route_debug(a.polyline, r.id))->>'overlap_ratio' as overlap_ratio,
  (match_activity_to_route_debug(a.polyline, r.id))->>'matched' as matched
from activities a
cross join routes r
join challenges c on c.id = r.challenge_id and c.is_active = true
where a.polyline is not null and trim(a.polyline) != ''
order by a.started_at desc, r.stage_number
limit 200;


-- -----------------------------------------------------------------------------
-- 6. Full debug result per (activity, route) for active challenge
-- One row per activity that has polyline, with one column per route stage.
-- -----------------------------------------------------------------------------
with active_routes as (
  select r.id, r.stage_number
  from routes r
  join challenges c on c.id = r.challenge_id and c.is_active = true
),
activities_with_polyline as (
  select id, started_at, polyline
  from activities
  where polyline is not null and trim(polyline) != ''
  limit 20
)
select
  a.id as activity_id,
  a.started_at,
  jsonb_object_agg(
    'stage_' || ar.stage_number,
    match_activity_to_route_debug(a.polyline, ar.id)
  ) as per_route_similarity
from activities_with_polyline a
cross join active_routes ar
group by a.id, a.started_at
order by a.started_at desc;


-- -----------------------------------------------------------------------------
-- 7. Manual overlap with literal polylines (for ad‑hoc testing)
-- Paste an activity polyline and a route polyline; use buffer_meters and min_overlap as needed.
-- -----------------------------------------------------------------------------
/*
do $$
declare
  activity_polyline text := 'PASTE_ACTIVITY_POLYLINE_HERE';
  route_polyline text := 'PASTE_ROUTE_POLYLINE_HERE';
  buf_meters int := 30;
  min_overlap numeric := 0.8;
  activity_geo geography;
  route_geo geography;
  overlap_ratio numeric;
  matched boolean;
begin
  activity_geo := ST_LineFromEncodedPolyline(activity_polyline, 5)::geography;
  route_geo := ST_LineFromEncodedPolyline(route_polyline, 5)::geography;
  overlap_ratio :=
    ST_Length(ST_Intersection(ST_Buffer(route_geo, buf_meters), activity_geo)) / nullif(ST_Length(route_geo), 0);
  matched := (overlap_ratio >= min_overlap);
  raise notice 'activity_points=% route_points=% overlap_ratio=% matched=%',
    ST_NPoints(activity_geo::geometry), ST_NPoints(route_geo::geometry), overlap_ratio, matched;
end;
$$;
*/


-- -----------------------------------------------------------------------------
-- 8. Overlap ratio only (scalar) for one activity and one route
-- Returns a single number in [0, 1] or null if invalid.
-- -----------------------------------------------------------------------------
/*
select
  ST_Length(
    ST_Intersection(
      ST_Buffer(
        ST_LineFromEncodedPolyline(r.polyline, 5)::geography,
        coalesce(r.buffer_meters, 30)
      ),
      ST_LineFromEncodedPolyline(a.polyline, 5)::geography
    )
  ) / nullif(ST_Length(ST_LineFromEncodedPolyline(r.polyline, 5)::geography), 0) as overlap_ratio
from activities a, routes r
where a.id = 'ACTIVITY_UUID_HERE'
  and r.id = 'ROUTE_UUID_HERE'
  and a.polyline is not null and trim(a.polyline) != ''
  and r.polyline is not null and trim(r.polyline) != '';
*/
