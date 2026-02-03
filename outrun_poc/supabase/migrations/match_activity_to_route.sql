-- Purpose: Compare activity polyline against buffered route.
-- Called by the process-activities edge function.
-- Activity polyline must be Google encoded polyline (Strava map.summary_polyline), precision 5.
-- Route gpx_geo is normalized to precision-5 geography for comparison so GPX-derived routes
-- match the same format as Strava.

create or replace function match_activity_to_route(
  activity_polyline text,
  route_id uuid
) returns boolean as $$
declare
  route geography;
  route_encoded text;
  route_geo_5 geography;
  activity geography;
  buf_meters integer;
  min_overlap numeric;
  overlap_ratio numeric;
begin
  -- Guard: no route row or null gpx_geo
  select gpx_geo, buffer_meters, min_overlap_ratio
    into route, buf_meters, min_overlap
    from routes where id = route_id;
  if route is null then
    return false;
  end if;

  -- Guard: null or empty activity polyline
  if activity_polyline is null or trim(activity_polyline) = '' then
    return false;
  end if;

  -- Decode activity with explicit precision 5 (Strava format)
  activity := ST_LineFromEncodedPolyline(activity_polyline, 5)::geography;

  -- Guard: single-point or zero-length activity
  if ST_Length(activity) = 0 then
    return false;
  end if;

  -- Normalize route to precision-5 geography (same format as Strava)
  route_encoded := ST_AsEncodedPolyline(route::geometry, 5);
  route_geo_5 := ST_LineFromEncodedPolyline(route_encoded, 5)::geography;

  -- Guard: zero-length route after normalization
  if ST_Length(route_geo_5) = 0 then
    return false;
  end if;

  overlap_ratio :=
    ST_Length(
      ST_Intersection(
        ST_Buffer(route_geo_5, coalesce(buf_meters, 30)),
        activity
      )
    ) / ST_Length(route_geo_5);

  return overlap_ratio >= coalesce(min_overlap, 0.8);
end;
$$ language plpgsql;
