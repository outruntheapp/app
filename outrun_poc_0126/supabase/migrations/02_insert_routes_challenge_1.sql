-- Routes for challenge_1 (legacy stub).
-- Real route geometry is synced from GPX by the app: GET /api/routes fetches
-- public/routes/challenge_1/stage-*.gpx and calls sync_challenge_routes_from_wkt (migration 07).


-- Stage 1 for challenge_1
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
SELECT 
  id,
  1,
  ST_GeogFromText('LINESTRING(18.4241 -33.9249, 18.426 -33.9235, 18.428 -33.922)'),
  30,
  0.8
FROM challenges 
WHERE is_active = true
LIMIT 1;


-- Stage 2 for challenge_1
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
SELECT 
  id,
  2,
  ST_GeogFromText('LINESTRING(18.42 -33.918, 18.4225 -33.917, 18.425 -33.916)'),
  30,
  0.8
FROM challenges 
WHERE is_active = true
LIMIT 1;


-- Stage 3 for challenge_1
INSERT INTO routes (challenge_id, stage_number, gpx_geo, buffer_meters, min_overlap_ratio)
SELECT 
  id,
  3,
  ST_GeogFromText('LINESTRING(18.43 -33.93, 18.433 -33.929, 18.436 -33.928)'),
  30,
  0.8
FROM challenges 
WHERE is_active = true
LIMIT 1;
