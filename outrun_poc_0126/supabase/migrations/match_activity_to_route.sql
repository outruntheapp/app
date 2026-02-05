-- Purpose: Compare activity polyline against buffered route.
-- Called by the process-activities edge function.
-- Activity polyline must be Google encoded polyline (Strava map.summary_polyline), precision 5.
-- When routes.polyline is set, use it (decode with precision 5) so route and activity are same format;
-- else fall back to normalizing route from gpx_geo (encode then decode at precision 5).

create or replace function match_activity_to_route(
  activity_polyline text,
  route_id uuid
) returns boolean as $$
declare
  route geography;
  route_polyline text;
  route_encoded text;
  route_geo_5 geography;
  activity geography;
  buf_meters integer;
  min_overlap numeric;
  overlap_ratio numeric;
begin
  -- Guard: no route row or null gpx_geo
  select gpx_geo, polyline, buffer_meters, min_overlap_ratio
    into route, route_polyline, buf_meters, min_overlap
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

  -- Route geography for comparison: use stored polyline when present, else normalize from gpx_geo
  if route_polyline is not null and trim(route_polyline) != '' then
    route_geo_5 := ST_LineFromEncodedPolyline(route_polyline, 5)::geography;
  else
    route_encoded := ST_AsEncodedPolyline(route::geometry, 5);
    route_geo_5 := ST_LineFromEncodedPolyline(route_encoded, 5)::geography;
  end if;

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
