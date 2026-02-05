-- Add routes.polyline (Google encoded polyline, precision 5) for matching with Strava activity polylines.
-- Populate on sync from GPX and use in match_activity_to_route.

alter table routes add column if not exists polyline text;

-- Update sync RPC to set polyline when inserting from WKT (same format as Strava).
create or replace function sync_challenge_routes_from_wkt(
  p_challenge_id uuid,
  p_wkt_1 text,
  p_wkt_2 text,
  p_wkt_3 text
)
returns void
language plpgsql
security definer
as $$
begin
  delete from routes
  where challenge_id = p_challenge_id and stage_number in (1, 2, 3);

  if p_wkt_1 is not null and trim(p_wkt_1) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, polyline, buffer_meters, min_overlap_ratio)
    values (
      p_challenge_id, 1,
      ST_GeogFromText(p_wkt_1),
      ST_AsEncodedPolyline(ST_GeogFromText(p_wkt_1)::geometry, 5),
      30, 0.8
    );
  end if;
  if p_wkt_2 is not null and trim(p_wkt_2) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, polyline, buffer_meters, min_overlap_ratio)
    values (
      p_challenge_id, 2,
      ST_GeogFromText(p_wkt_2),
      ST_AsEncodedPolyline(ST_GeogFromText(p_wkt_2)::geometry, 5),
      30, 0.8
    );
  end if;
  if p_wkt_3 is not null and trim(p_wkt_3) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, polyline, buffer_meters, min_overlap_ratio)
    values (
      p_challenge_id, 3,
      ST_GeogFromText(p_wkt_3),
      ST_AsEncodedPolyline(ST_GeogFromText(p_wkt_3)::geometry, 5),
      30, 0.8
    );
  end if;
end;
$$;

-- Backfill existing route rows from gpx_geo.
update routes
set polyline = ST_AsEncodedPolyline(gpx_geo::geometry, 5)
where gpx_geo is not null and (polyline is null or polyline = '');
