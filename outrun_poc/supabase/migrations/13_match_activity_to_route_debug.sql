-- Diagnostic RPC: returns overlap_ratio and point counts for a given (activity_polyline, route_id).
-- Read-only, for debugging why an activity and route do or do not match.
-- Same decoding logic as match_activity_to_route; returns jsonb instead of boolean.

create or replace function match_activity_to_route_debug(
  activity_polyline text,
  route_id uuid
) returns jsonb as $$
declare
  route geography;
  route_polyline text;
  route_encoded text;
  route_geo_5 geography;
  activity geography;
  buf_meters integer;
  min_overlap numeric;
  overlap_ratio numeric;
  activity_point_count int;
  route_point_count int;
  route_polyline_used boolean;
  matched boolean;
begin
  -- No route row or null gpx_geo
  select gpx_geo, polyline, buffer_meters, min_overlap_ratio
    into route, route_polyline, buf_meters, min_overlap
    from routes where id = route_id;
  if route is null then
    return jsonb_build_object(
      'activity_point_count', null,
      'route_polyline_used', false,
      'route_point_count', null,
      'overlap_ratio', null,
      'matched', false
    );
  end if;

  route_polyline_used := (route_polyline is not null and trim(route_polyline) != '');

  -- Null or empty activity polyline
  if activity_polyline is null or trim(activity_polyline) = '' then
    if route_polyline_used then
      route_geo_5 := ST_LineFromEncodedPolyline(route_polyline, 5)::geography;
      route_point_count := ST_NPoints(route_geo_5::geometry);
    else
      route_encoded := ST_AsEncodedPolyline(route::geometry, 5);
      route_geo_5 := ST_LineFromEncodedPolyline(route_encoded, 5)::geography;
      route_point_count := ST_NPoints(route_geo_5::geometry);
    end if;
    return jsonb_build_object(
      'activity_point_count', null,
      'route_polyline_used', route_polyline_used,
      'route_point_count', route_point_count,
      'overlap_ratio', null,
      'matched', false
    );
  end if;

  -- Decode activity (precision 5); on failure activity_point_count stays null
  begin
    activity := ST_LineFromEncodedPolyline(activity_polyline, 5)::geography;
    activity_point_count := ST_NPoints(activity::geometry);
  exception when others then
    activity := null;
    activity_point_count := null;
  end;

  -- Route geography for comparison
  if route_polyline_used then
    route_geo_5 := ST_LineFromEncodedPolyline(route_polyline, 5)::geography;
  else
    route_encoded := ST_AsEncodedPolyline(route::geometry, 5);
    route_geo_5 := ST_LineFromEncodedPolyline(route_encoded, 5)::geography;
  end if;
  route_point_count := ST_NPoints(route_geo_5::geometry);

  -- Cannot compute overlap if activity or route is zero length
  if activity is null or ST_Length(activity) = 0 or ST_Length(route_geo_5) = 0 then
    return jsonb_build_object(
      'activity_point_count', activity_point_count,
      'route_polyline_used', route_polyline_used,
      'route_point_count', route_point_count,
      'overlap_ratio', null,
      'matched', false
    );
  end if;

  overlap_ratio :=
    ST_Length(
      ST_Intersection(
        ST_Buffer(route_geo_5, coalesce(buf_meters, 30)),
        activity
      )
    ) / ST_Length(route_geo_5);

  matched := (overlap_ratio >= coalesce(min_overlap, 0.8));

  return jsonb_build_object(
    'activity_point_count', activity_point_count,
    'route_polyline_used', route_polyline_used,
    'route_point_count', route_point_count,
    'overlap_ratio', overlap_ratio,
    'matched', matched
  );
end;
$$ language plpgsql;
