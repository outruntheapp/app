-- Purpose: Compare activity polyline against buffered route
-- This function is called by the process-activities edge function
-- Note: ST_LineFromEncodedPolyline may require a PostGIS extension or custom implementation

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
