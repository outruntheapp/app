-- Migration: RPC to sync routes table from WKT (used by app when loading GPX from public).
-- Purpose: Allow GET /api/routes to write route geometry from GPX files into the DB.
-- Called only by the Next.js API route with service role; no grant to anon.

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
    insert into routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
    values (p_challenge_id, 1, ST_GeogFromText(p_wkt_1), 30, 0.8);
  end if;
  if p_wkt_2 is not null and trim(p_wkt_2) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
    values (p_challenge_id, 2, ST_GeogFromText(p_wkt_2), 30, 0.8);
  end if;
  if p_wkt_3 is not null and trim(p_wkt_3) != '' then
    insert into routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
    values (p_challenge_id, 3, ST_GeogFromText(p_wkt_3), 30, 0.8);
  end if;
end;
$$;
